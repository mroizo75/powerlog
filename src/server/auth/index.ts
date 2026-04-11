import NextAuth from "next-auth";
import { cache } from "react";
import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

export const auth = cache(uncachedAuth);
export { uncachedAuth as middlewareAuth, handlers, signIn, signOut };
