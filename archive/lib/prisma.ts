import { PrismaClient } from "@prisma/client";

// A single shared client. Creating a new PrismaClient per request (and calling
// $disconnect() after each one) exhausts the connection pool under serverless /
// dev hot-reload. Reuse one instance instead.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
