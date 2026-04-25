/**
 * Manus OAuth routes — DISABLED.
 * Authentication is now handled by localAuth.ts (email/password JWT).
 * This file is kept as an empty stub to avoid breaking imports.
 */
import type { Express } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerOAuthRoutes(_app: Express): void {
  // No-op: Manus OAuth is disabled
}
