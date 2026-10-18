import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, publicConfig } from "@/lib/public-config";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/setup",
  "/auth/callback",
  "/forgot-password",
  "/reset-password",
]);

function buildCsp(): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

function secure(response: NextResponse, pathname: string): NextResponse {
  if (!pathname.startsWith("/api/")) {
    response.headers.set("Content-Security-Policy", buildCsp());
    response.headers.set("X-Frame-Options", "DENY");
  }
  return response;
}

function redirectTo(request: NextRequest, pathname: string, source: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return secure(redirect, pathname);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // API routes handle their own authentication and response headers.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  if (!isSupabaseConfigured()) {
    return secure(NextResponse.next({ request }), pathname);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicConfig.supabaseUrl, publicConfig.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!user && !isPublic) {
    return redirectTo(request, "/login", response);
  }

  if (user && pathname === "/login") {
    return redirectTo(request, "/dashboard", response);
  }

  return secure(response, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
