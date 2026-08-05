import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 は接続 URL を schema.prisma に書けないので、ドライバアダプタ経由で渡す。
// 接続先の正は prisma.config.ts (CLI 側) と この関数 (アプリ側) の 2 か所になる。
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL が設定されていません。.env.example を .env にコピーして値を入れてください。",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// dev の HMR でモジュールが再評価されるたびに接続プールが増えるのを防ぐ
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
