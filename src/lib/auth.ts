import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, sql } from './db';
import * as schema from './schema';
import { ApiError } from './http';
let instance: ReturnType<typeof createAuth> | undefined;
function createAuth() {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
    throw new Error('BETTER_AUTH_SECRET must have at least 32 characters');
  return betterAuth({
    database: drizzleAdapter(db(), { provider: 'pg', schema }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL!],
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'admin', input: false } } },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: process.env.NODE_ENV === 'production' },
  });
}
export function auth() {
  return (instance ??= createAuth());
}
export async function requireAdmin(request: Request) {
  const session = await auth().api.getSession({ headers: request.headers });
  if (!session) throw new ApiError(401, 'กรุณาเข้าสู่ระบบผู้ดูแล');
  const [admin] = await sql()`SELECT id FROM "user" WHERE id=${session.user.id} AND role='admin'`;
  if (!admin) throw new ApiError(403, 'ไม่มีสิทธิ์ผู้ดูแลระบบ');
  return admin.id as string;
}
