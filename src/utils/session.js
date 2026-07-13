import { createHmac, timingSafeEqual } from "crypto";

const SESSION_COOKIE_NAME = "koperasi_session";
const SESSION_SECRET = process.env.SESSION_COOKIE_SECRET || "default_dev_session_secret";

function sign(payload) {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

function createSessionToken(session) {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function parseSessionToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expectedSignature = sign(payload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function getSessionCookieValue(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!match) return null;
  return match.slice(SESSION_COOKIE_NAME.length + 1);
}

export function getSessionFromCookieString(cookieString) {
  const token = getSessionCookieValue(cookieString);
  return parseSessionToken(token);
}

export function getSessionFromCookieHeader(cookieHeader) {
  const token = getSessionCookieValue(cookieHeader);
  return parseSessionToken(token);
}

export function createSessionCookie(session) {
  const token = createSessionToken(session);
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; ${isProd ? "Secure;" : ""}`;
}

export function clearSessionCookie() {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; ${isProd ? "Secure;" : ""}`;
}
