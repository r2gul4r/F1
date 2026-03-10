import { describe, expect, it } from "vitest";
import { OAuthUserRepository } from "../src/store/oauth-user-repository.js";

type QueryResultRow = Record<string, unknown>;

type MockPool = {
  query: (text: string, values?: readonly unknown[]) => Promise<{ rows: QueryResultRow[] }>;
  calls: Array<{ text: string; values: readonly unknown[] | undefined }>;
};

const createMockPool = (responses: QueryResultRow[][]): MockPool => {
  const calls: Array<{ text: string; values: readonly unknown[] | undefined }> = [];
  let responseIndex = 0;
  return {
    calls,
    query: async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      const next = responses[responseIndex];
      responseIndex += 1;
      return {
        rows: next ?? []
      };
    }
  };
};

describe("oauth user repository", () => {
  it("OAuth 사용자 식별자를 upsert하고 조회함", async () => {
    const pool = createMockPool([
      [],
      [],
      [],
      [
        {
          user_id: "user-1",
          provider: "github",
          provider_user_id: "1234",
          display_name: "Ray",
          email: "ray@example.com",
          avatar_url: "https://example.com/ray.png"
        }
      ]
    ]);

    const repository = new OAuthUserRepository(pool);

    const user = await repository.upsertIdentity({
      provider: "github",
      providerUserId: "1234",
      displayName: "<b>Ray</b>",
      email: "ray@example.com",
      avatarUrl: "https://example.com/ray.png"
    });

    expect(user.userId).toBe("user-1");
    expect(user.displayName).toBe("Ray");
    expect(pool.calls).toHaveLength(4);
    expect(pool.calls[0]?.text).toContain("where provider = $1 and provider_user_id = $2");
    expect(pool.calls[1]?.text).toContain("insert into app_users");
    expect(pool.calls[2]?.text).toContain("insert into oauth_identities");
  });

  it("필수 식별자가 비면 실패함", async () => {
    const pool = createMockPool([]);
    const repository = new OAuthUserRepository(pool);

    await expect(
      repository.upsertIdentity({
        provider: "",
        providerUserId: "1234",
        displayName: "Ray"
      })
    ).rejects.toThrow("요청 처리 실패");
  });
});
