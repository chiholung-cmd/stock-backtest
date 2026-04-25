export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Local auth: redirect to /login page instead of Manus OAuth portal
export const getLoginUrl = (returnPath?: string) => {
  const base = "/login";
  if (returnPath) return `${base}?redirect=${encodeURIComponent(returnPath)}`;
  return base;
};
