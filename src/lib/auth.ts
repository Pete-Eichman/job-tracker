import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

// A syntactically valid bcrypt hash with no corresponding real password.
// Used to burn a comparable amount of CPU time on the "user not found" path
// (see authorize() below) so response timing doesn't reveal whether an email
// is registered -- bcrypt.compare() on a real hash and on this one take
// approximately the same time, since both pay the same cost-factor work.
const DUMMY_PASSWORD_HASH =
  "$2b$12$v.VqCjll03yKMQpEowmIYeH070G89ynYxo.UJmdLyP2wgGmrrE222";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // Always compare against a hash -- the user's real one if they exist,
        // otherwise the fixed dummy hash -- so a non-existent (or
        // OAuth-only, passwordless) account takes about the same time as a
        // real one. Skipping bcrypt entirely on the miss path is a timing
        // oracle for account enumeration.
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH
        );

        if (!user || !user.passwordHash || !isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});