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
console.log("- GOOGLE_CLIENT_ID length:", process.env.GOOGLE_CLIENT_ID?.length || 0);
console.log("- GOOGLE_CLIENT_SECRET length:", process.env.GOOGLE_CLIENT_SECRET?.length || 0);
console.log("- AUTH_SECRET length:", process.env.AUTH_SECRET?.length || 0);
console.log("- MONGODB_URI exists:", !!process.env.MONGODB_URI);

if (!process.env.AUTH_SECRET) {
    console.error("[Auth Start] CRITICAL: AUTH_SECRET is missing!");
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
    // v5 requires explicitly setting the strategy if needed
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            console.log(`[NextAuth][signIn] User: ${user?.email}, Account: ${!!account}`);
            return true;
        },
        async jwt({ token, account, user }) {
            if (account && user) {
                console.log(`[NextAuth][jwt] Token generated for: ${user.email}`);
                token.accessToken = account.access_token;
                // Only overwrite if we actually get a new refresh token
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
    secret: process.env.AUTH_SECRET,
    debug: true, // Keep debug enabled to see warnings
})
