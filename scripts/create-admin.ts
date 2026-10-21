import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { sql } from '../src/lib/db';
const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
if (!email || !email.includes('@')) throw new Error('Set ADMIN_BOOTSTRAP_EMAIL');
if (process.stdin.isTTY)
  throw new Error('Provide the password through stdin, never command-line arguments');
let password = '';
for await (const chunk of process.stdin) password += chunk;
password = password.trim();
if (password.length < 12) throw new Error('Password must have at least 12 characters');
const hashed = await hashPassword(password);
password = '';
const id = randomUUID();
try {
  await sql().begin(async (tx) => {
    await tx`INSERT INTO "user"(id,name,email,"emailVerified",role) VALUES (${id},'Administrator',${email.toLowerCase()},true,'admin')`;
    await tx`INSERT INTO account(id,"accountId","providerId","userId",password) VALUES (${randomUUID()},${id},'credential',${id},${hashed})`;
  });
  console.log('Administrator created. Public sign-up remains disabled.');
} finally {
  await sql().end();
}
