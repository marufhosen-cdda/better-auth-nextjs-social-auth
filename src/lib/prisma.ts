import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Ensure Prisma only runs in server environment
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined | any;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        datasourceUrl: process.env.DATABASE_URL || "prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19aS3RyZG5jREpDU2FhdW1IeU90bUciLCJhcGlfa2V5IjoiMDFLM0RLSFc3UURZQVRSRU1QQjBCTVIwMzYiLCJ0ZW5hbnRfaWQiOiIxNWQ1OTA0Zjc2OTBjZTE3YmQzNGZlYWI1YmUyZDJjM2JiYzNlMjE3NzA5NDcwMGE0ZmI2MjY1Nzc1ZmIwOTBkIiwiaW50ZXJuYWxfc2VjcmV0IjoiZGYyNTg5YzYtOGRmNi00ZDY1LWFjZGUtMWFhMDZhMjYwNzM2In0.ZBf38zahaApBtzJLUBMUV8KmjPmOkJ46hgAwyk_hbZA",
    }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;