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
  strategy: z.string(),
  params: z.record(z.string(), z.number()),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeframe: z.enum(["1d", "1wk", "1mo"]).default("1d"),
  initialCapital: z.number().default(10000),
  contributeAmount: z.number().default(0),
  contributePeriod: z.enum(["none", "weekly", "monthly", "quarterly"]).default("none"),
  redrawAmount: z.number().default(0),
  redrawPeriod: z.enum(["none", "weekly", "monthly", "quarterly"]).default("none"),
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
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })),
        model: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        // Use the last message as the query for now, or join them
        const lastMessage = input.messages[input.messages.length - 1].content;
        const response = await poe.chat(lastMessage, input.model);
        return { reply: response };
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
    run: publicProcedure
      .input(RunBacktestInput)
      .mutation(async ({ input, ctx }) => {
        const result = await runBacktest({
          ticker: input.ticker,
          strategy: input.strategy,
          params: input.params,
          startDate: input.startDate,
          endDate: input.endDate,
          timeframe: input.timeframe,
          initialCapital: input.initialCapital,
          contributeAmount: input.contributeAmount,
          contributePeriod: input.contributePeriod,
          redrawAmount: input.redrawAmount,
          redrawPeriod: input.redrawPeriod,
        });

        if (input.saveResult && ctx.user) {
          await saveBacktestResult({
            userId: ctx.user.id,
            ...result,
          });
        }

        return result;
      }),

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

    list: protectedProcedure.query(async ({ ctx }) => {
      return getBacktestResultsByUser(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const result = await getBacktestResultById(input.id);
        if (!result || result.userId !== ctx.user.id) {
          throw new Error("Result not found");
        }
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteBacktestResult(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
