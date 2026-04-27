import { nanoid } from "nanoid";

export async function createShareLink(backtestId: number, isPublic: boolean) {
  const token = nanoid(10);
  return { token };
}
export async function validateShareLink(token: string) { return null; }
export async function addComment() {}
export async function getComments() { return []; }
export async function forkBacktest() {}
export async function getPublicLeaderboard() { return []; }
