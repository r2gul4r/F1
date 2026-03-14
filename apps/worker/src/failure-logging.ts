import { toOpaqueError } from "@f1/shared";

const logOpaqueFailure = (context: string, error: unknown): void => {
  const opaque = toOpaqueError(error);
  console.error(context, opaque.publicMessage);
};

export const logWorkerStartupFailure = (error: unknown): void => {
  logOpaqueFailure("워커 시작 실패", error);
};

export const logWorkerEnvValidationFailure = (error: unknown): void => {
  logOpaqueFailure("워커 환경 검증 실패", error);
};

export const logWorkerRealtimeSendFailure = (error: unknown): void => {
  logOpaqueFailure("워커 전송 실패", error);
};
