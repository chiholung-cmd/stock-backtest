import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, backtestResults, InsertUser, InsertBacktestResult } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Auth ────────────────────────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(users).values({
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name ?? null,
    lastSignedIn: new Date(),
  });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return result[0] ?? undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? undefined;
}

export async function updateLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

// ─── Backtest Results ─────────────────────────────────────────────────────────

export async function saveBacktestResult(data: {
  userId: number;
  ticker: string;
  strategy: string;
  strategyParams: Record<string, number>;
  startDate: string;
  endDate: string;
  annualizedReturn?: number | null;
  maxDrawdown?: number | null;
  sharpeRatio?: number | null;
  winRate?: number | null;
  totalTrades?: number | null;
  equityCurve?: unknown;
  trades?: unknown;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(backtestResults).values({
    userId: data.userId,
    ticker: data.ticker,
    strategy: data.strategy,
    strategyParams: data.strategyParams,
    startDate: data.startDate,
    endDate: data.endDate,
    annualizedReturn: data.annualizedReturn ?? null,
    maxDrawdown: data.maxDrawdown ?? null,
    sharpeRatio: data.sharpeRatio ?? null,
    winRate: data.winRate ?? null,
    totalTrades: data.totalTrades ?? null,
    equityCurve: data.equityCurve ?? [],
    trades: data.trades ?? [],
  });
}

export async function getBacktestResultsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(backtestResults)
    .where(eq(backtestResults.userId, userId))
    .orderBy(backtestResults.createdAt);
}

export async function getBacktestResultById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(backtestResults)
    .where(eq(backtestResults.id, id))
    .limit(1);

  return result[0] ?? undefined;
}

export async function deleteBacktestResult(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership before deleting
  const existing = await getBacktestResultById(id);
  if (!existing || existing.userId !== userId) {
    throw new Error("Result not found or access denied");
  }

  await db.delete(backtestResults).where(eq(backtestResults.id, id));
}
