import { defineConfig } from "prisma/config";

// Prisma 7 の設定ローダは .env を読まない (@prisma/config が c12 を dotenv: false で呼ぶ)。
// migrate / db push は DATABASE_URL を要求するので、ここで明示的に読み込む。
// Vercel のように .env が無くプラットフォーム側の環境変数だけがある環境では失敗するので握る。
try {
  process.loadEnvFile();
} catch {
  // .env が無いだけ。process.env に既に入っている値をそのまま使う
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Prisma 7 では schema.prisma の datasource に url を書けない (P1012)。接続先はここが正。
  // 未設定でも throw しない (prisma generate は DB を要らないため。postinstall で走る)。
  datasource: { url: process.env.DATABASE_URL },
});
