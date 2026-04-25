import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users, backtestResults, aiConversations } from "../drizzle/schema";

let _pool: mysql.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDbConnection() {
  if (!_pool && process.env.DATABASE_URL) {
    try {
      console.log("[Database] Initializing connection pool...");
      
      const connectionString = process.env.DATABASE_URL;
      const url = new URL(connectionString.startsWith('mysql://') ? connectionString : `mysql://${connectionString}`);
      const cleanUri = `${url.protocol}//${url.username}:${url.password}@${url.host}${url.pathname}`;

      _pool = mysql.createPool({
        uri: cleanUri,
        ssl: {
          rejectUnauthorized: false 
        },
        enableKeepAlive: true,
        connectionLimit: 5,
        waitForConnections: true,
        queueLimit: 0,
      });

      _db = drizzle(_pool);
      console.log("[Database] Connection pool created successfully.");
    } catch (error) {
      console.error("[Database] Initialization failed:", error);
      _pool = null;
      _db = null;
    }
  }
  return { pool: _pool, db: _db };
}

// ─── User Auth ────────────────────────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name?: string;
}): Promise<void> {
  const { pool } = await getDbConnection();
  if (!pool) throw new Error("Database pool not available");

  try {
    // 使用最原始、最穩定的原生 SQL 插入語句，避開 ORM 的語法衝突
    const sql = `
      INSERT INTO users (email, password_hash, name, role) 
      VALUES (?, ?, ?, 'user')
    `;
    const params = [
      data.email.toLowerCase().trim(),
      data.passwordHash,
      data.name?.trim() || null
    ];
    
    console.log(`[Database] Executing native SQL insert for ${data.email}...`);
    await pool.execute(sql, params);
    console.log(`[Database] Native SQL insert successful.`);
  } catch (error: any) {
    console.error(`[Database] createUser failed for ${data.email}:`, error);
    throw error;
  }
}

export async function getUserByEmail(email: string) {
  const { db } = await getDbConnection();
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
  const { db } = await getDbConnection();
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
  const { db } = await getDbConnection();
  if (!db) return;
  try {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
  } catch (error) {
    console.error(`[Database] updateLastSignedIn failed for ${id}:`, error);
  }
}

// ─── Backtest Results ─────────────────────────────────────────────────────────

export async function saveBacktestResult(data: any): Promise<void> {
  const { db } = await getDbConnection();
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
  const { db } = await getDbConnection();
  if (!db) return [];

  return db
    .select()
    .from(backtestResults)
    .where(eq(backtestResults.userId, userId))
    .orderBy(backtestResults.createdAt);
}

export async function getBacktestResultById(id: number) {
  const { db } = await getDbConnection();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(backtestResults)
    .where(eq(backtestResults.id, id))
    .limit(1);

  return result[0] ?? undefined;
}

export async function deleteBacktestResult(id: number, userId: number): Promise<void> {
  const { db } = await getDbConnection();
  if (!db) throw new Error("Database not available");

  const existing = await getBacktestResultById(id);
  if (!existing || existing.userId !== userId) {
    throw new Error("Result not found or access denied");
  }

  await db.delete(backtestResults).where(eq(backtestResults.id, id));
}

// ─── AI Conversations ────────────────────────────────────────────────────────

export async function saveAiConversation(userId: number, topic: string, messages: any[]) {
  const { db } = await getDbConnection();
  if (!db) throw new Error("Database not available");

  await db.insert(aiConversations).values({
    userId,
    topic,
    messages,
  });
}

export async function getAiConversationsByUser(userId: number) {
  const { db } = await getDbConnection();
  if (!db) return [];

  return db
    .select()
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(aiConversations.createdAt);
}
