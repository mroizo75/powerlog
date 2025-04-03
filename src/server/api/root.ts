import { createTRPCRouter, createCallerFactory } from "@/server/api/trpc";
import { postRouter } from "@/server/api/routers/post";
import { declarationRouter } from "@/server/api/routers/declaration";
import { weightRouter } from "@/server/api/routers/weight";
import { reportRouter } from "@/server/api/routers/report";
import { powerlogRouter } from "@/server/api/routers/powerlog";
import { carRouter } from "@/server/api/routers/car";
import { adminRouter } from "@/server/api/routers/admin";
import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  declaration: declarationRouter,
  weight: weightRouter,
  report: reportRouter,
  powerlog: powerlogRouter,
  car: carRouter,
  admin: adminRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
