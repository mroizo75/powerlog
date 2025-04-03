import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { hash } from "bcryptjs";

export const userRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["ADMIN", "USER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Sjekk om brukeren er admin
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Kun administratorer kan opprette nye brukere",
        });
      }

      // Sjekk om e-postadressen allerede er i bruk
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "E-postadressen er allerede i bruk",
        });
      }

      // Hash passordet
      const hashedPassword = await hash(input.password, 12);

      // Opprett ny bruker
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          role: input.role,
        },
      });

      return user;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Sjekk om brukeren er admin
    if (ctx.session?.user?.role !== "ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Kun administratorer kan se alle brukere",
      });
    }

    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Sjekk om brukeren er admin
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Kun administratorer kan oppdatere brukere",
        });
      }

      // Sjekk om e-postadressen allerede er i bruk av en annen bruker
      const existingUser = await ctx.db.user.findFirst({
        where: {
          email: input.email,
          NOT: {
            id: input.id,
          },
        },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "E-postadressen er allerede i bruk",
        });
      }

      const user = await ctx.db.user.update({
        where: { id: input.id },
        data: {
          email: input.email,
        },
      });

      return user;
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Sjekk om brukeren er admin
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Kun administratorer kan slette brukere",
        });
      }

      // Sjekk om brukeren prøver å slette seg selv
      if (ctx.session.user.id === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Du kan ikke slette din egen bruker",
        });
      }

      const user = await ctx.db.user.delete({
        where: { id: input.id },
      });

      return user;
    }),
}); 