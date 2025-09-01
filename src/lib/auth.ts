import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma"; prisma

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
    },
    baseURL: process.env.BETTER_AUTH_URL || "https://better-auth-nextjs-social-auth.vercel.app",
    trustedOrigins: [
        process.env.BETTER_AUTH_URL || "https://better-auth-nextjs-social-auth.vercel.app"
    ],
    secret: process.env.BETTER_AUTH_SECRET!,
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
    },
});

export type Session = typeof auth.$Infer.Session;