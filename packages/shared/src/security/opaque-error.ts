export class OpaqueError extends Error {
  public readonly publicMessage: string;

  constructor(message = "요청 처리 실패") {
    super(message);
    this.publicMessage = message;
  }
}

export const toOpaqueError = (error: unknown): OpaqueError => {
  if (error instanceof OpaqueError) {
    return error;
  }
  return new OpaqueError();
};