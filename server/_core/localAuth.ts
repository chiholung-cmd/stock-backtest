/**
 * Local JWT Authentication Routes
 * Replaces Manus OAuth with standard email/password auth.
 *
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — sign in, set session cookie
 * POST /api/auth/logout    — clear session cookie
 * GET  /api/auth/me        — return current user (from cookie)
 */

import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { SignJWT } from "jose";
import { createUser, getUserByEmail, getUserById, updateLastSignedIn } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "../../shared/const";
import { parse as parseCookieHeader } from "cookie";
import { jwtVerify } from "jose";

const SALT_ROUNDS = 10;

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
  return new TextEncoder().encode(secret);
}

async function createSessionToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(getJwtSecret());
}

export function registerLocalAuthRoutes(app: Express): void {
  // ── Register ──────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body as {
        email?: string;
        password?: string;
        name?: string;
      };

      console.log(`[Auth] 嘗試註冊: ${email}`);

      if (!email || !password) {
        console.warn("[Auth] 缺少必填欄位");
        return res.status(400).json({ error: "請輸入電子郵件和密碼" });
      }
      if (password.length < 6) {
        console.warn("[Auth] 密碼過短");
        return res.status(400).json({ error: "密碼長度至少需要 6 位" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      console.log(`[Auth] 正規化後的 Email: ${normalizedEmail}`);

      // 檢查是否已存在
      const existing = await getUserByEmail(normalizedEmail);
      if (existing) {
        console.log(`[Auth] 註冊失敗: ${normalizedEmail} 已被佔用`);
        return res.status(409).json({ error: "該電子郵件已被註冊" });
      }

      // 雜湊密碼
      console.log("[Auth] 開始雜湊密碼...");
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      console.log("[Auth] 密碼雜湊完成");

      // 寫入資料庫
      console.log("[Auth] 開始寫入資料庫...");
      try {
        await createUser({ 
          email: normalizedEmail, 
          passwordHash, 
          name: name?.trim() || undefined 
        });
        console.log(`[Auth] ✓ 資料庫寫入成功: ${normalizedEmail}`);
      } catch (dbErr: any) {
        console.error("[Auth] ✗ 資料庫寫入失敗");
        console.error("[Auth] 錯誤詳情:", dbErr);
        console.error("[Auth] 錯誤訊息:", dbErr.message);
        console.error("[Auth] 錯誤代碼:", dbErr.code);
        console.error("[Auth] SQL 狀態:", dbErr.sqlState);
        
        // 回傳詳細的錯誤訊息供前端診斷
        return res.status(500).json({ 
          error: `資料庫寫入失敗: ${dbErr.message}`,
          details: {
            code: dbErr.code,
            sqlState: dbErr.sqlState,
            message: dbErr.message,
          }
        });
      }

      // 驗證用戶是否真的被建立
      console.log("[Auth] 驗證用戶是否已建立...");
      const user = await getUserByEmail(normalizedEmail);
      if (!user) {
        console.error("[Auth] ✗ 用戶建立後無法獲取");
        return res.status(500).json({ error: "用戶建立後無法驗證" });
      }
      console.log(`[Auth] ✓ 用戶驗證成功，ID: ${user.id}`);

      // 建立 Session Token
      console.log("[Auth] 建立 Session Token...");
      const token = await createSessionToken(user.id);
      const cookieOpts = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOpts,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      console.log(`[Auth] ✓ 註冊成功: ${normalizedEmail}`);
      return res.status(201).json({ 
        success: true,
        user: { id: user.id, email: user.email, name: user.name } 
      });
    } catch (err: any) {
      console.error("[Auth] 未預期的錯誤:", err);
      return res.status(500).json({ 
        error: "伺服器內部錯誤",
        details: err.message 
      });
    }
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };

      console.log(`[Auth] 嘗試登入: ${email}`);

      if (!email || !password) {
        return res.status(400).json({ error: "請輸入電子郵件和密碼" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await getUserByEmail(normalizedEmail);

      if (!user) {
        console.log(`[Auth] 登入失敗: ${normalizedEmail} 不存在`);
        return res.status(401).json({ error: "電子郵件或密碼錯誤" });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        console.log(`[Auth] 登入失敗: ${normalizedEmail} 密碼不符`);
        return res.status(401).json({ error: "電子郵件或密碼錯誤" });
      }

      await updateLastSignedIn(user.id);

      const token = await createSessionToken(user.id);
      const cookieOpts = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOpts,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      console.log(`[Auth] ✓ 登入成功: ${normalizedEmail}`);
      return res.status(200).json({ 
        success: true,
        user: { id: user.id, email: user.email, name: user.name } 
      });
    } catch (err: any) {
      console.error("[Auth] 登入錯誤:", err);
      return res.status(500).json({ error: "伺服器內部錯誤" });
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    return res.status(200).json({ success: true });
  });

  // ── Get Current User ──────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const cookies = parseCookieHeader(req.headers.cookie ?? "");
      const token = cookies[COOKIE_NAME];

      if (!token) {
        return res.status(401).json({ error: "未登入" });
      }

      const secret = getJwtSecret();
      const verified = await jwtVerify(token, secret);
      const userId = Number(verified.payload.sub);

      const user = await getUserById(userId);
      if (!user) {
        return res.status(401).json({ error: "用戶不存在" });
      }

      return res.status(200).json({ user });
    } catch (err: any) {
      console.error("[Auth] 驗證 Token 失敗:", err.message);
      return res.status(401).json({ error: "無效的 Token" });
    }
  });
}
