import { NextRequest, NextResponse } from "next/server";

const opaqueMessage = "요청 처리 실패";
const relayDisabledStatus = 503;

const relayUnavailableResponse = () =>
  NextResponse.json({ message: opaqueMessage }, { status: relayDisabledStatus });

export const POST = async (request: Request) => {
  void request;
  return relayUnavailableResponse();
};

export const GET = async (request: NextRequest) => {
  void request;
  return relayUnavailableResponse();
};

export const DELETE = async (_request: NextRequest) => {
  return relayUnavailableResponse();
};
