import { toOpaqueError } from "@f1/shared";
import { NextRequest, NextResponse } from "next/server";
import { requestAuthSession, requestWatchSession, OAuthLoginBridgeError } from "@/src/lib/oauth-login";
import { clearWatchSessionCookie, setWatchSessionCookie, watchSessionCookieName } from "@/src/lib/watch-session-cookie";

const opaqueMessage = "요청 처리 실패";

const readWatchSessionToken = (request: NextRequest): string =>
  request.cookies.get(watchSessionCookieName)?.value?.trim() ?? "";

export const POST = async (request: Request) => {
  try {
    const session = await requestWatchSession(await request.json());
    const response = NextResponse.json({
      ok: true,
      user: session.user
    });

    return setWatchSessionCookie(response, session.accessToken, session.expiresInSec);
  } catch (error) {
    if (error instanceof OAuthLoginBridgeError) {
      return NextResponse.json({ message: opaqueMessage }, { status: error.status });
    }

    const opaque = toOpaqueError(error);
    return NextResponse.json({ message: opaque.publicMessage }, { status: 500 });
  }
};

export const GET = async (request: NextRequest) => {
  try {
    const authSession = await requestAuthSession(readWatchSessionToken(request));
    return NextResponse.json(authSession);
  } catch (error) {
    if (error instanceof OAuthLoginBridgeError) {
      return NextResponse.json({ message: opaqueMessage }, { status: error.status });
    }

    const opaque = toOpaqueError(error);
    return NextResponse.json({ message: opaque.publicMessage }, { status: 500 });
  }
};

export const DELETE = async (_request: NextRequest) => {
  const response = NextResponse.json({ ok: true });
  return clearWatchSessionCookie(response);
};
