import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname === "/login" ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production"
    });

    // Hvis brukeren er admin og prøver å gå til forsiden
    if (token?.role === "ADMIN" && request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Hvis brukeren med POWERLOG-rolle prøver å gå til forsiden
    if (token?.role === "POWERLOG" && request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/admin/powerlog", request.url));
    }

    // Hvis brukeren prøver å aksessere admin-ruter
    if (request.nextUrl.pathname.startsWith("/admin")) {
      // Hvis brukeren ikke er logget inn
      if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      // Sjekk tilgang basert på rolle
      if (token.role === "ADMIN") {
        // Admin har tilgang til alt
        return NextResponse.next();
      } else if (token.role === "VEKTREG") {
        // VEKTREG kan se weightreg-seksjonen, vektliste og boxlog
        if (request.nextUrl.pathname.startsWith("/admin/weightreg") || 
            request.nextUrl.pathname.startsWith("/admin/weight-list") ||
            request.nextUrl.pathname.startsWith("/admin/boxlog")) {
          return NextResponse.next();
        }
      } else if (token.role === "TEKNISK") {
        // TEKNISK kan se alt unntatt powerlog, boxlog og users
        if (!request.nextUrl.pathname.startsWith("/admin/powerlog") && 
            !request.nextUrl.pathname.startsWith("/admin/boxlog") &&
            !request.nextUrl.pathname.startsWith("/admin/users")) {
          return NextResponse.next();
        }
      } else if (token.role === "INNSJEKK" && request.nextUrl.pathname.startsWith("/admin/check-in")) {
        // INNSJEKK kan kun se check-in
        return NextResponse.next();
      } else if (token.role === "POWERLOG") {
        // POWERLOG kan kun se powerlog
        if (request.nextUrl.pathname.startsWith("/admin/powerlog")) {
          return NextResponse.next();
        }
        // Hvis POWERLOG-bruker prøver å aksessere andre admin-sider, redirect til powerlog
        return NextResponse.redirect(new URL("/admin/powerlog", request.url));
      }

      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch {
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}; 