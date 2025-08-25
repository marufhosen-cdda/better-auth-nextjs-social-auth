import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for API routes, auth routes, and static files
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/_next/') ||
        pathname.includes('.') // Skip files with extensions
    ) {
        return NextResponse.next();
    }

    // Protected routes
    const protectedRoutes = ["/dashboard", "/profile"];
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    );

    const baseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://better-auth-nextjs-social-auth.vercel.app"

    if (isProtectedRoute) {
        try {
            // Use fetch to check session instead of direct auth import
            const sessionResponse = await fetch(
                new URL(`${baseURL}/api/auth/get-session`, request.url),
                {
                    headers: {
                        'cookie': request.headers.get('cookie') || '',
                    },
                }
            );

            if (!sessionResponse.ok || sessionResponse.status === 401) {
                // Redirect to home page with sign-in prompt
                const homeUrl = new URL("/?auth=required", request.url);
                return NextResponse.redirect(homeUrl);
            }

            const session = await sessionResponse.json();
            if (!session?.user) {
                const homeUrl = new URL("/?auth=required", request.url);
                return NextResponse.redirect(homeUrl);
            }
        } catch (error) {
            console.error("Middleware session check error:", error);
            // If there's an error checking the session, redirect to home
            const homeUrl = new URL("/?auth=required", request.url);
            return NextResponse.redirect(homeUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Files with extensions
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
    ],
};