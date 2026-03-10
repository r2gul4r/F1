import { OpaqueError, sanitizeUserHtml } from "@f1/shared";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export type OAuthUser = {
  userId: string;
  provider: string;
  providerUserId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

export type UpsertOAuthIdentityInput = {
  provider: string;
  providerUserId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
};

type Queryable = Pick<Pool, "query">;

type NormalizedOAuthIdentityInput = {
  provider: string;
  providerUserId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
};

const selectUserIdByIdentitySql = `
  select user_id
  from oauth_identities
  where provider = $1 and provider_user_id = $2
  limit 1
`;

const upsertUserSql = `
  insert into app_users (id, display_name, avatar_url)
  values ($1, $2, $3)
  on conflict (id)
  do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now()
`;

const upsertIdentitySql = `
  insert into oauth_identities (provider, provider_user_id, user_id, email)
  values ($1, $2, $3, $4)
  on conflict (provider, provider_user_id)
  do update set
    user_id = excluded.user_id,
    email = excluded.email,
    updated_at = now()
`;

const selectIdentitySql = `
  select
    users.id as user_id,
    identities.provider,
    identities.provider_user_id,
    users.display_name,
    identities.email,
    users.avatar_url
  from oauth_identities as identities
  inner join app_users as users on users.id = identities.user_id
  where identities.provider = $1 and identities.provider_user_id = $2
  limit 1
`;

const sanitizeRequired = (value: string): string => {
  const normalized = sanitizeUserHtml(value).trim();
  if (normalized.length === 0) {
    throw new OpaqueError("요청 처리 실패");
  }
  return normalized;
};

const sanitizeOptional = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = sanitizeUserHtml(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeInput = (input: UpsertOAuthIdentityInput): NormalizedOAuthIdentityInput => ({
  provider: sanitizeRequired(input.provider),
  providerUserId: sanitizeRequired(input.providerUserId),
  displayName: sanitizeRequired(input.displayName),
  email: sanitizeOptional(input.email),
  avatarUrl: sanitizeOptional(input.avatarUrl)
});

const mapOAuthUser = (row: Record<string, unknown>): OAuthUser => ({
  userId: String(row.user_id),
  provider: String(row.provider),
  providerUserId: String(row.provider_user_id),
  displayName: String(row.display_name),
  email: row.email ? String(row.email) : null,
  avatarUrl: row.avatar_url ? String(row.avatar_url) : null
});

export class OAuthUserRepository {
  constructor(private readonly pool: Queryable) {}

  private async resolveUserId(provider: string, providerUserId: string): Promise<string> {
    const { rows } = await this.pool.query(selectUserIdByIdentitySql, [provider, providerUserId]);
    const userId = rows[0]?.user_id;
    if (typeof userId === "string" && userId.trim().length > 0) {
      return userId;
    }
    return randomUUID();
  }

  async findByIdentity(provider: string, providerUserId: string): Promise<OAuthUser | null> {
    const { rows } = await this.pool.query(selectIdentitySql, [provider, providerUserId]);
    if (!rows[0]) {
      return null;
    }
    return mapOAuthUser(rows[0] as Record<string, unknown>);
  }

  async upsertIdentity(input: UpsertOAuthIdentityInput): Promise<OAuthUser> {
    const normalized = normalizeInput(input);
    const userId = await this.resolveUserId(normalized.provider, normalized.providerUserId);

    await this.pool.query(upsertUserSql, [userId, normalized.displayName, normalized.avatarUrl]);
    await this.pool.query(upsertIdentitySql, [
      normalized.provider,
      normalized.providerUserId,
      userId,
      normalized.email
    ]);

    const user = await this.findByIdentity(normalized.provider, normalized.providerUserId);
    if (!user) {
      throw new OpaqueError("요청 처리 실패");
    }
    return user;
  }
}
