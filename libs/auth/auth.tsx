import { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github"

import PrismaClient from "../prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter"

const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  adapter: PrismaAdapter(PrismaClient),
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  session: {
    strategy: "jwt",
  },
};

export default authConfig;