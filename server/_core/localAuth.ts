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

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await getUserByEmail(normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      await createUser({ email: normalizedEmail, passwordHash, name: name?.trim() });

      const user = await getUserByEmail(normalizedEmail);
      if (!user) throw new Error("User creation failed");

      const token = await createSessionToken(user.id);
      const cookieOpts = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOpts,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err) {
      console.error("[Auth] Register error:", err);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      await updateLastSignedIn(user.id);

      const token = await createSessionToken(user.id);
      const cookieOpts = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, {
        ...cookieOpts,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOpts = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: -1 });
    return res.json({ success: true });
  });

  // ── Me ────────────────────────────────────────────────────────────────────
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const cookies = parseCookieHeader(req.headers.cookie ?? "");
      const token = cookies[COOKIE_NAME];
      if (!token) return res.json(null);

      const { payload } = await jwtVerify(token, getJwtSecret(), { algorithms: ["HS256"] });
      const userId = payload.sub ? parseInt(payload.sub, 10) : null;
      if (!userId || isNaN(userId)) return res.json(null);

      const user = await getUserById(userId);
      if (!user) return res.json(null);

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch {
      return res.json(null);
    }
  });
}
