import { z } from "zod";
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
import { runBacktest } from "./backtest";
import { PoeApiWrapper } from "./poe";

const poe = new PoeApiWrapper(process.env.POE_API_KEY || "");

// ─── Strategy param schemas ───────────────────────────────────────────────────

const RunBacktestInput = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  strategy: z.enum(["ma_crossover", "rsi", "macd", "bollinger_bands"]),
  params: z.record(z.string(), z.number()),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  saveResult: z.boolean().default(false),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  ai: router({
    analyzeGoal: protectedProcedure
      .input(z.object({
        goal: z.string().min(1),
        model: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const result = await poe.analyzeGoal(input.goal, input.model);
        return { analysis: result };
      }),
    chat: protectedProcedure
      .input(z.object({
        message: z.string().min(1),
        model: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const response = await poe.chat(input.message, input.model);
        return { response };
      }),
  }),
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
        const result = await runBacktest({
          ticker: input.ticker,
          strategy: input.strategy,
          params: input.params,
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
        strategyParams: z.record(z.string(), z.number()),
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
