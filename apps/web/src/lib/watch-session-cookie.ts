import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const watchSessionCookieName = "f1_watch_session";

const hasCookieValue = (value: string | undefined): value is string => Boolean(value && value.trim().length > 0);

export const readWatchSessionToken = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const value = cookieStore.get(watchSessionCookieName)?.value?.trim();
  return hasCookieValue(value) ? value : null;
};

export const setWatchSessionCookie = (
  response: NextResponse,
  accessToken: string,
  expiresInSec: number
): NextResponse => {
  response.cookies.set({
    name: watchSessionCookieName,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expiresInSec
  });

  return response;
};

export const clearWatchSessionCookie = (response: NextResponse): NextResponse => {
  response.cookies.set({
    name: watchSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
};
