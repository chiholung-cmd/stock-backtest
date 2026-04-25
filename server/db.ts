import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users, backtestResults, aiConversations } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log("[Database] Initializing connection...");
      
      let connectionString = process.env.DATABASE_URL;
      // 確保 SSL 配置正確
      if (connectionString.includes("tidbcloud.com") && !connectionString.includes("ssl=")) {
        const separator = connectionString.includes("?") ? "&" : "?";
        connectionString += `${separator}ssl={"rejectUnauthorized":true}`;
      }

      const poolConnection = mysql.createPool({
        uri: connectionString,
        ssl: {
          rejectUnauthorized: true
        },
        enableKeepAlive: true,
        connectionLimit: 5, // 減少連線數以適應 Serverless
      });

      _db = drizzle(poolConnection);
      console.log("[Database] Connection pool created successfully.");
    } catch (error) {
      console.error("[Database] Initialization failed:", error);
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

  try {
    // 顯式提供所有必填欄位，避免 TiDB 預設值衝突
    await db.insert(users).values({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name ?? null,
      role: "user",
      // 不傳遞 createdAt, updatedAt, lastSignedIn 讓資料庫使用 defaultNow()
    });
  } catch (error: any) {
    console.error(`[Database] createUser failed for ${data.email}:`, error);
    throw new Error(`資料庫寫入失敗: ${error.message}`);
  }
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    return result[0] ?? undefined;
  } catch (error) {
    console.error(`[Database] getUserByEmail failed for ${email}:`, error);
    return undefined;
  }
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? undefined;
  } catch (error) {
    console.error(`[Database] getUserById failed for ${id}:`, error);
    return undefined;
  }
}

export async function updateLastSignedIn(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
  } catch (error) {
    console.error(`[Database] updateLastSignedIn failed for ${id}:`, error);
  }
}

// ─── Backtest Results ─────────────────────────────────────────────────────────

export async function saveBacktestResult(data: any): Promise<void> {
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

  const existing = await getBacktestResultById(id);
  if (!existing || existing.userId !== userId) {
    throw new Error("Result not found or access denied");
  }

  await db.delete(backtestResults).where(eq(backtestResults.id, id));
}

// ─── AI Conversations ────────────────────────────────────────────────────────

export async function saveAiConversation(userId: number, topic: string, messages: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(aiConversations).values({
    userId,
    topic,
    messages,
  });
}

export async function getAiConversationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(aiConversations.createdAt);
}
