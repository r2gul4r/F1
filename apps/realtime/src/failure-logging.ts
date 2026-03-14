import { toOpaqueError } from "@f1/shared";

const logOpaqueFailure = (context: string, error: unknown): void => {
  const opaque = toOpaqueError(error);
  console.error(context, opaque.publicMessage);
};

export const logRealtimeStartupFailure = (error: unknown): void => {
  logOpaqueFailure("리얼타임 서버 시작 실패", error);
};

export const logRealtimeEnvValidationFailure = (error: unknown): void => {
  logOpaqueFailure("리얼타임 환경 검증 실패", error);
};
