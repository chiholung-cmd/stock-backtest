import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module to avoid actual DB calls
vi.mock("./db", () => ({
  saveBacktestResult: vi.fn().mockResolvedValue(undefined),
  getBacktestResultsByUser: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      ticker: "AAPL",
      strategy: "ma_crossover",
      strategyParams: { shortPeriod: 10, longPeriod: 30 },
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      annualizedReturn: 0.15,
      maxDrawdown: -0.12,
      sharpeRatio: 0.85,
      winRate: 0.6,
      totalTrades: 5,
      equityCurve: [],
      trades: [],
      createdAt: new Date(),
    },
  ]),
  getBacktestResultById: vi.fn().mockResolvedValue(null),
  deleteBacktestResult: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock execSync to avoid actual Python execution in tests
vi.mock("child_process", () => ({
  execSync: vi.fn().mockReturnValue(
    JSON.stringify({
      success: true,
      data: {
        ticker: "AAPL",
        strategy: "ma_crossover",
        strategyParams: { shortPeriod: 10, longPeriod: 30 },
        startDate: "2023-01-01",
        endDate: "2023-12-31",
        annualizedReturn: 0.1507,
        maxDrawdown: -0.1684,
        sharpeRatio: 0.7348,
        winRate: 0.5,
        totalTrades: 4,
        equityCurve: [{ date: "2023-01-03", value: 10000 }],
        trades: [],
      },
    })
  ),
}));

function createContext(user?: TrpcContext["user"]): TrpcContext {
  return {
    user: user ?? null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("backtest.run", () => {
  it("runs a backtest and returns results", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.backtest.run({
      ticker: "AAPL",
      strategy: "ma_crossover",
      params: { shortPeriod: 10, longPeriod: 30 },
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      saveResult: false,
    });

    expect(result.ticker).toBe("AAPL");
    expect(result.strategy).toBe("ma_crossover");
    expect(typeof result.annualizedReturn).toBe("number");
    expect(typeof result.maxDrawdown).toBe("number");
    expect(typeof result.sharpeRatio).toBe("number");
    expect(typeof result.winRate).toBe("number");
    expect(typeof result.totalTrades).toBe("number");
    expect(Array.isArray(result.equityCurve)).toBe(true);
  });
});

describe("backtest.list", () => {
  it("returns saved backtest results for authenticated user", async () => {
    const ctx = createContext({
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const caller = appRouter.createCaller(ctx);

    const results = await caller.backtest.list();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.ticker).toBe("AAPL");
  });

  it("throws when user is not authenticated", async () => {
    const ctx = createContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.backtest.list()).rejects.toThrow();
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createContext({
      id: 1,
      openId: "test-user",
      name: "Test",
      email: null,
      loginMethod: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
