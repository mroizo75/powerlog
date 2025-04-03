import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    console.log("Middleware kjører for path:", request.nextUrl.pathname);
    
    // Hvis det er en API-rute, la den gå videre
    if (request.nextUrl.pathname.startsWith("/api")) {
      console.log("API route detektert, lar passere");
      return NextResponse.next();
    }

    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXT_AUTH_SECRET 
    });

    console.log("Token status:", token ? "Eksisterer" : "Eksisterer ikke");
    if (token) {
      console.log("Token data:", {
        id: token.id,
        role: token.role,
        email: token.email
      });
    }

    // Hvis brukeren er admin og prøver å gå til forsiden
    if (token?.role === "ADMIN" && request.nextUrl.pathname === "/") {
      console.log("Admin bruker prøver å gå til forsiden, redirecter til admin dashboard");
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Hvis brukeren prøver å aksessere admin-ruter
    if (request.nextUrl.pathname.startsWith("/admin")) {
      console.log("Admin route detektert");
      
      // Hvis brukeren ikke er logget inn eller ikke har ADMIN-rolle
      if (!token) {
        console.log("Ingen token funnet, redirecter til login");
        return NextResponse.redirect(new URL("/login", request.url));
      }

      if (token.role !== "ADMIN") {
        console.log("Bruker har ikke ADMIN-rolle, redirecter til forsiden");
        return NextResponse.redirect(new URL("/", request.url));
      }

      console.log("Bruker har ADMIN-rolle, tillater tilgang");
      return NextResponse.next();
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware feil:", error);
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