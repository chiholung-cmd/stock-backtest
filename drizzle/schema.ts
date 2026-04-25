import { int, mysqlEnum, mysqlTable, timestamp, varchar, float, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export const backtestResults = mysqlTable("backtest_results", {
  id: int("id").autoincrement().primaryKey(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiConversations = mysqlTable("ai_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  topic: varchar("topic", { length: 255 }),
  messages: json("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
