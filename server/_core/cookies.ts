import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : forwardedProto.split(",");
    if (protoList.some(proto => proto.trim().toLowerCase() === "https")) return true;
  }

  // Render 和其他代理平台可能使用 x-forwarded-ssl
  const forwardedSsl = req.headers["x-forwarded-ssl"];
  if (forwardedSsl === "on") return true;

  // 如果是生產環境且沒有其他線索，預設為安全（Render 必定是 HTTPS）
  if (process.env.NODE_ENV === "production") return true;

  return false;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isSecure = isSecureRequest(req);
  
  // 在生產環境中，確保 secure 為 true（Render 必定是 HTTPS）
  const secure = process.env.NODE_ENV === "production" ? true : isSecure;
  
  // sameSite 設置：
  // - 生產環境：使用 "none" 以支持跨域（需要 secure: true）
  // - 開發環境：使用 "lax" 以支持本地測試
  const sameSite = process.env.NODE_ENV === "production" ? "none" : "lax";

  return {
    httpOnly: true,
    path: "/",
    sameSite: sameSite as any,
    secure,
  };
}
