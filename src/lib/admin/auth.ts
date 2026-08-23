import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import "server-only";

const COOKIE_NAME = "admin_session";

function expectedCookieValue(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set.");
  return createHash("sha256").update(password).digest("hex");
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;

  const expected = Buffer.from(expectedCookieValue());
  const actual = Buffer.from(value.padEnd(expected.length, "0").slice(0, expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function trySetAdminSession(password: string): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, expectedCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
  });
  return true;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
