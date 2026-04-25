import { z } from "zod";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  saveBacktestResult,
  getBacktestResultsByUser,
  getBacktestResultById,
  deleteBacktestResult,
} from "./db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Strategy param schemas ───────────────────────────────────────────────────

const MACrossoverParams = z.object({
  shortPeriod: z.number().min(2).max(200).default(10),
  longPeriod: z.number().min(5).max(500).default(30),
});

const RSIParams = z.object({
  period: z.number().min(2).max(100).default(14),
  oversold: z.number().min(1).max(49).default(30),
  overbought: z.number().min(51).max(99).default(70),
});

const MACDParams = z.object({
  fastPeriod: z.number().min(2).max(100).default(12),
  slowPeriod: z.number().min(5).max(200).default(26),
  signalPeriod: z.number().min(2).max(50).default(9),
});

const BollingerBandsParams = z.object({
  period: z.number().min(5).max(200).default(20),
  stdDev: z.number().min(0.5).max(5).default(2),
});

const StrategyParamsSchema = z.union([
  MACrossoverParams,
  RSIParams,
  MACDParams,
  BollingerBandsParams,
]);

const RunBacktestInput = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  strategy: z.enum(["ma_crossover", "rsi", "macd", "bollinger_bands"]),
  params: z.record(z.string(), z.any()),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  saveResult: z.boolean().default(false),
});

// ─── Helper: run Python backtest engine ──────────────────────────────────────

function runPythonBacktest(input: {
  ticker: string;
  strategy: string;
  params: Record<string, string | number>;
  startDate: string;
  endDate: string;
}) {
  const enginePath = path.join(__dirname, "backtest_engine.py");
  const inputJson = JSON.stringify(input);

  try {
    const output = execSync(`python3 "${enginePath}" '${inputJson.replace(/'/g, "'\\''")}'`, {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    }).toString();

    const result = JSON.parse(output.trim());
    if (!result.success) {
      throw new Error(result.error || "Backtest failed");
    }
    return result.data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(`Backtest engine error: ${err.message}`);
    }
    throw new Error("Unknown backtest error");
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  backtest: router({
    // Run a backtest (optionally save if authenticated)
    run: publicProcedure
      .input(RunBacktestInput)
      .mutation(async ({ input, ctx }) => {
        const result = await runPythonBacktest({
          ticker: input.ticker,
          strategy: input.strategy,
          params: input.params as Record<string, number>,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        // Save to DB if user is logged in and saveResult is true
        if (input.saveResult && ctx.user) {
          await saveBacktestResult({
            userId: ctx.user.id,
            ticker: result.ticker,
            strategy: result.strategy,
            strategyParams: result.strategyParams,
            startDate: result.startDate,
            endDate: result.endDate,
            annualizedReturn: result.annualizedReturn,
            maxDrawdown: result.maxDrawdown,
            sharpeRatio: result.sharpeRatio,
            winRate: result.winRate,
            totalTrades: result.totalTrades,
            equityCurve: result.equityCurve,
            trades: result.trades,
          });
        }

        return result;
      }),

    // Save a completed backtest result
    save: protectedProcedure
      .input(z.object({
        ticker: z.string(),
        strategy: z.string(),
        strategyParams: z.record(z.string(), z.any()),
        startDate: z.string(),
        endDate: z.string(),
        annualizedReturn: z.number().nullable(),
        maxDrawdown: z.number().nullable(),
        sharpeRatio: z.number().nullable(),
        winRate: z.number().nullable(),
        totalTrades: z.number().nullable(),
        equityCurve: z.array(z.object({ date: z.string(), value: z.number() })),
        trades: z.array(z.any()),
      }))
      .mutation(async ({ input, ctx }) => {
        await saveBacktestResult({
          userId: ctx.user.id,
          ...input,
        });
        return { success: true };
      }),

    // List all saved results for current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return getBacktestResultsByUser(ctx.user.id);
    }),

    // Get a single result by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const result = await getBacktestResultById(input.id);
        if (!result || result.userId !== ctx.user.id) {
          throw new Error("Result not found");
        }
        return result;
      }),

    // Delete a result
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteBacktestResult(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
