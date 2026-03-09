const realtimeHttp = process.env.NEXT_PUBLIC_REALTIME_HTTP_BASE ?? "http://localhost:4001";
const hasWatchToken = (token: string): boolean => token.trim().length > 0;

const safeFetch = async <T>(path: string, watchToken: string): Promise<T> => {
  if (!hasWatchToken(watchToken)) {
    throw new Error("요청 처리 실패");
  }

  const response = await fetch(`${realtimeHttp}${path}`, {
    cache: "no-store",
    headers: {
      "x-watch-token": watchToken
    }
  });

  if (!response.ok) {
    throw new Error("요청 처리 실패");
  }

  return (await response.json()) as T;
};

export const apiClient = {
  getCurrentSession: <T>(watchToken: string) => safeFetch<T>("/api/v1/sessions/current", watchToken),
  getDrivers: <T>(sessionId: string, watchToken: string) => safeFetch<T>(`/api/v1/sessions/${sessionId}/drivers`, watchToken)
};
