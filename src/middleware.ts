import { NextResponse } from "next/server";
import { middlewareAuth } from "@/server/auth";

export default middlewareAuth((request) => {
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

  const session = request.auth;
  const role = session?.user?.role;

  if (role === "ADMIN" && pathname === "/") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (role === "POWERLOG" && pathname === "/") {
    return NextResponse.redirect(new URL("/admin/powerlog", request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (role === "ADMIN") {
      return NextResponse.next();
    }

    if (role === "VEKTREG") {
      if (
        pathname.startsWith("/admin/weightreg") ||
        pathname.startsWith("/admin/weight-list") ||
        pathname.startsWith("/admin/boxlog")
      ) {
        return NextResponse.next();
      }
    }

    if (role === "TEKNISK") {
      if (
        !pathname.startsWith("/admin/powerlog") &&
        !pathname.startsWith("/admin/boxlog") &&
        !pathname.startsWith("/admin/users")
      ) {
        return NextResponse.next();
      }
    }

    if (role === "INNSJEKK" && pathname.startsWith("/admin/check-in")) {
      return NextResponse.next();
    }

    if (role === "POWERLOG") {
      if (pathname.startsWith("/admin/powerlog")) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL("/admin/powerlog", request.url));
    }

    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
