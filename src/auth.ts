import NextAuth, { type DefaultSession } from "next-auth"
import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

// Extend session type
declare module "next-auth" {
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        user: {
            id: string;
        } & DefaultSession["user"]
    }
}

// Debug environment variables at startup (Safe for logs)
console.log("[Auth Start] Debugging Environment Variables:");
console.log("- GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
console.log("- AUTH_SECRET length:", process.env.AUTH_SECRET?.length || 0);
console.log("- NEXTAUTH_SECRET length:", process.env.NEXTAUTH_SECRET?.length || 0);

// Fallback for secret
const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!secret) {
    console.error("[Auth Start] CRITICAL: Neither AUTH_SECRET nor NEXTAUTH_SECRET is set!");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    scope: [
                        "openid",
                        "email",
                        "profile",
                        "https://www.googleapis.com/auth/calendar",
                        "https://www.googleapis.com/auth/calendar.events",
                        "https://www.googleapis.com/auth/drive.file"
                    ].join(" ")
                },
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account }) {
            console.log(`[NextAuth][signIn] Success for: ${user?.email}`);
            return true;
        },
        async jwt({ token, account, user }) {
            if (account && user) {
                token.accessToken = account.access_token;
                if (account.refresh_token) {
                    token.refreshToken = account.refresh_token;
                }
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = (token.id || token.sub) as string;
                session.accessToken = token.accessToken as string;
                session.refreshToken = token.refreshToken as string;
            }
            return session;
        },
    },
    secret: secret,
    debug: true,
})
