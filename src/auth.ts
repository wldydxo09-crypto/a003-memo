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
        async jwt({ token, account, user }) {
            // Initial sign in
            if (account && user) {
                console.log(`[NextAuth] Sign-in login: ${user.email}, ID: ${user.id}`);
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                // Ensure we use the string ID format (fallback to sub)
                session.user.id = (token.id || token.sub) as string;
                session.accessToken = token.accessToken as string;
                session.refreshToken = token.refreshToken as string;
                console.log(`[NextAuth] Session created for ID: ${session.user.id}`);
            }
            return session;
        },
    },
    debug: process.env.NODE_ENV === 'development',
    pages: {
        error: '/api/auth/error', // Optional: customize error page
    }
})
