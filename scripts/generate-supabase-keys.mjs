#!/usr/bin/env node
/**
 * 根据 JWT_SECRET 生成自托管 Supabase 所需的 ANON_KEY / SERVICE_ROLE_KEY（HS256）。
 *
 * 用法：
 *   node scripts/generate-supabase-keys.mjs
 *   node scripts/generate-supabase-keys.mjs "你的JWT_SECRET至少32字符"
 *
 * 也可读取环境变量 JWT_SECRET，或项目根目录 .env 中的 JWT_SECRET=...
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signHs256(secret, header, payload) {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${signature}`;
}

function readJwtSecretFromEnvFile() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, "utf8");
  const match = text.match(/^JWT_SECRET=(.*)$/m);
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function main() {
  const fromArg = process.argv[2];
  const secret =
    fromArg ||
    process.env.JWT_SECRET ||
    readJwtSecretFromEnvFile() ||
    "super-secret-jwt-token-with-at-least-32-characters-long";

  if (secret.length < 32) {
    console.error("错误：JWT_SECRET 至少需要 32 个字符。");
    process.exit(1);
  }

  if (
    secret.includes("your-jwt-secret") ||
    secret === "your-jwt-secret-at-least-32-chars"
  ) {
    console.error(
      "错误：检测到占位符 JWT_SECRET。请先在 .env 中换成真实密钥，或作为参数传入。"
    );
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 10 * 365 * 24 * 60 * 60; // 约 10 年，仅用于本地开发 API key
  const header = { alg: "HS256", typ: "JWT" };

  const anonKey = signHs256(secret, header, {
    role: "anon",
    iss: "supabase",
    iat: now,
    exp,
  });
  const serviceRoleKey = signHs256(secret, header, {
    role: "service_role",
    iss: "supabase",
    iat: now,
    exp,
  });

  console.log("# 把下面几行写入项目根目录 .env，并同步到 nextjs/.env.local\n");
  console.log(`JWT_SECRET=${secret}`);
  console.log(`ANON_KEY=${anonKey}`);
  console.log(`SERVICE_ROLE_KEY=${serviceRoleKey}`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`);
  console.log(
    "\n# 改完后执行：docker compose up -d --force-recreate supabase-auth supabase-rest supabase-kong"
  );
  console.log(
    "# 本机跑 Next 时还要更新 nextjs/.env.local 中的同名变量，然后重启 npm run dev"
  );
}

main();
