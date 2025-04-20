import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const boxlogRouter = createTRPCRouter({
  // Hent alle boxlogger
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.boxLog.findMany({
      include: {
        declaration: {
          include: {
            car: true,
          },
        },
        createdBy: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // Hent boxlog for en bestemt boxId
  getByBoxId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const boxlog = await ctx.db.boxLog.findFirst({
        where: {
          boxId: input,
          isActive: true,
        },
        include: {
          declaration: {
            include: {
              car: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!boxlog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ingen aktiv boxlog funnet for denne Box ID",
        });
      }

      return boxlog;
    }),

  // Hent boxlog for et bestemt startnummer
  getByStartNumber: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const boxlog = await ctx.db.boxLog.findFirst({
        where: {
          startNumber: input,
          isActive: true,
        },
        include: {
          declaration: {
            include: {
              car: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!boxlog) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ingen aktiv boxlog funnet for dette startnummeret",
        });
      }

      return boxlog;
    }),

  // Opprett eller oppdater boxlog
  create: protectedProcedure
    .input(
      z.object({
        startNumber: z.string(),
        boxId: z.string(),
        declarationId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Sjekk om boxlog allerede eksisterer for denne box ID
      const existingBoxLog = await ctx.db.boxLog.findFirst({
        where: {
          boxId: input.boxId,
          isActive: true,
        },
      });

      // Hvis en eksisterende boxlog finnes, deaktiver den
      if (existingBoxLog) {
        await ctx.db.boxLog.update({
          where: {
            id: existingBoxLog.id,
          },
          data: {
            isActive: false,
          },
        });
      }

      // Sjekk om boxlog allerede eksisterer for dette startnummeret
      const existingStartNumberLog = await ctx.db.boxLog.findFirst({
        where: {
          startNumber: input.startNumber,
          isActive: true,
        },
      });

      // Hvis en eksisterende boxlog finnes for startnummeret, deaktiver den
      if (existingStartNumberLog) {
        await ctx.db.boxLog.update({
          where: {
            id: existingStartNumberLog.id,
          },
          data: {
            isActive: false,
          },
        });
      }

      // Finn selvangivelsen hvis declarationId ikke er oppgitt
      let declarationId = input.declarationId;
      if (!declarationId) {
        const declaration = await ctx.db.declaration.findFirst({
          where: {
            startNumber: input.startNumber,
            isActive: true,
          },
        });
        
        if (declaration) {
          declarationId = declaration.id;
        }
      }

      // Opprett ny boxlog
      return ctx.db.boxLog.create({
        data: {
          startNumber: input.startNumber,
          boxId: input.boxId,
          declarationId: declarationId,
          createdById: ctx.session.user.id,
        },
        include: {
          declaration: {
            include: {
              car: true,
            },
          },
        },
      });
    }),

  // Deaktiver en boxlog
  deactivate: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return ctx.db.boxLog.update({
        where: {
          id: input,
        },
        data: {
          isActive: false,
        },
      });
    }),

  // Fjern boxlog for et startnummer
  remove: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      // Finn og deaktiver alle aktive boxlogs for dette startnummeret
      const boxLogs = await ctx.db.boxLog.findMany({
        where: {
          startNumber: input,
          isActive: true,
        },
      });

      for (const boxLog of boxLogs) {
        await ctx.db.boxLog.update({
          where: { id: boxLog.id },
          data: { isActive: false },
        });
      }

      return { success: true };
    }),
}); 