import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/cover-letter", "/api/jobs/:path*"],
};
