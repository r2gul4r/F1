const relayDisabledStatus = 503;

export class OAuthLoginBridgeError extends Error {
  constructor(public readonly status: number) {
    super("요청 처리 실패");
    this.name = "OAuthLoginBridgeError";
  }
}

const throwRelayDisabled = (): never => {
  throw new OAuthLoginBridgeError(relayDisabledStatus);
};

export const requestWatchSession = async (_body: unknown): Promise<never> => {
  return throwRelayDisabled();
};

export const requestAuthSession = async (_watchToken: string): Promise<never> => {
  return throwRelayDisabled();
};
