import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Ensure Prisma only runs in server environment
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined | any;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL,
    }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;