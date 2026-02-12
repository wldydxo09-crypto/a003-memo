import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // This route was likely intended for custom Google Auth initialization.
    // To resolve "Bad Request" and ensure compatibility with NextAuth,
    // we redirect to the standard NextAuth Google sign-in endpoint.
    const origin = request.nextUrl.origin;
    return NextResponse.redirect(`${origin}/api/auth/signin/google`);
}
