import { mysqlTable, serial, varchar, timestamp, text, float, json, mysqlEnum, int } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  role: mysqlEnum("role", ["user", "admin"]).notNull().default("user"),
  // 將 timestamp 的預設值移除，交給資料庫 DEFAULT CURRENT_TIMESTAMP 處理
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
  lastSignedIn: timestamp("last_signed_in"),
});

export const backtestResults = mysqlTable("backtest_results", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  ticker: varchar("ticker", { length: 20 }).notNull(),
  strategy: varchar("strategy", { length: 50 }).notNull(),
  strategyParams: json("strategy_params").notNull(),
  startDate: varchar("start_date", { length: 20 }).notNull(),
  endDate: varchar("end_date", { length: 20 }).notNull(),
  annualizedReturn: float("annualized_return"),
  maxDrawdown: float("max_drawdown"),
  sharpeRatio: float("sharpe_ratio"),
  winRate: float("win_rate"),
  totalTrades: int("total_trades"),
  equityCurve: json("equity_curve"),
  trades: json("trades"),
  createdAt: timestamp("created_at"),
});

export const aiConversations = mysqlTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  topic: varchar("topic", { length: 255 }),
  messages: json("messages").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
