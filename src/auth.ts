import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
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
                    scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.file"
                },
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async session({ session, user, token }) {
            // In database strategy (Adapter), user is passed.
            // But for Google Tokens, we might need JWT strategy if we want to store tokens easily?
            // Actually, when using Adapter, NextAuth stores "Account" in DB.
            // We can retrieve access_token from the "accounts" collection if needed, OR 
            // we can switch to "jwt" session strategy to hold tokens in the cookie (easier for API access).

            // For this project, let's use JWT strategy for session to easily access tokens in API routes,
            // even though we use MongoDB adapter for User persistence. 
            // Wait, if we use Adapter, default is "database". 
            // If we want tokens in session, we usually need "jwt".

            // Let's use "jwt" strategy for now to simplify token passing to Calendar API.
            // But we still want to save User in DB. NextAuth allows Adapter + JWT.
            session.user.id = token.sub!;
            // Pass tokens to session for client/API usage
            session.accessToken = token.accessToken as string;
            session.refreshToken = token.refreshToken as string;
            return session;
        },
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token; // Only available if prompt="consent"
            }
            return token;
        }
    },

    // Ensure we can debug on mobile
    debug: process.env.NODE_ENV === 'development',
})
