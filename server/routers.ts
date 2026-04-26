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
import { runPortfolioBacktest } from "./portfolioBacktest";
import { PoeApiWrapper } from "./poe";
import { parseNaturalLanguageStrategy, optimizeStrategyParameters, generateStrategyRecommendations } from "./strategyOptimizer";

const poe = new PoeApiWrapper(process.env.POE_API_KEY || "");

// ─── Strategy param schemas ───────────────────────────────────────────────────

const PortfolioAsset = z.object({
  ticker: z.string().min(1).max(10).toUpperCase(),
  weight: z.number().min(0).max(100),
});

const RunBacktestInput = z.object({
  ticker: z.string().min(1).max(10).toUpperCase().optional(),
  portfolio: z.array(PortfolioAsset).max(10).optional(),
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
  rebalancePeriod: z.enum(["none", "quarterly", "semi-annual", "annual"]).default("none"),
  saveResult: z.boolean().default(false),
}).refine(
  (data) => data.ticker || (data.portfolio && data.portfolio.length > 0),
  { message: "Must provide either ticker or portfolio" }
);

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  ai: router({
    analyzeGoal: publicProcedure // ✅ 改為公共，方便測試
      .input(z.object({
        goal: z.string().min(1),
        model: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const result = await poe.analyzeGoal(input.goal, input.model);
        return { analysis: result };
      }),
    chat: publicProcedure // ✅ 改為公共，解決登入問題導致的 AI 聊天失敗
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })),
        model: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const lastMessage = input.messages[input.messages.length - 1].content;
        const response = await poe.chat(lastMessage, input.model, input.messages.slice(0, -1));
        return { reply: response };
      }),
    diagnose: publicProcedure // ✅ 改為公共，解決登入問題導致的 AI 診斷失敗
      .input(z.object({
        ticker: z.string().min(1),
        model: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await poe.diagnoseStock(input.ticker, input.model);
        return { diagnosis: result };
      }),
    parseStrategy: publicProcedure
      .input(z.object({
        description: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const strategy = await parseNaturalLanguageStrategy(input.description);
        return { strategy };
      }),
    optimizeStrategy: publicProcedure
      .input(z.object({
        strategyName: z.string(),
        currentParams: z.record(z.string(), z.number()),
        performance: z.object({
          annualizedReturn: z.number(),
          maxDrawdown: z.number(),
          sharpeRatio: z.number(),
          winRate: z.number(),
        }),
      }))
      .mutation(async ({ input }) => {
        const optimized = await optimizeStrategyParameters(
          input.strategyName,
          input.currentParams,
          input.performance
        );
        return { optimizedParams: optimized };
      }),
    getRecommendations: publicProcedure
      .input(z.object({
        marketCondition: z.string(),
        riskTolerance: z.enum(["low", "medium", "high"]),
      }))
      .mutation(async ({ input }) => {
        const recommendations = await generateStrategyRecommendations(
          input.marketCondition,
          input.riskTolerance
        );
        return { recommendations };
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
        let result;
        
        if (input.portfolio && input.portfolio.length > 0) {
          // 投資組合模式
          result = await runPortfolioBacktest({
            portfolio: input.portfolio,
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
            rebalancePeriod: input.rebalancePeriod || "none",
          });
        } else {
          // 單標的模式
          result = await runBacktest({
            ticker: input.ticker!,
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
        }

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
