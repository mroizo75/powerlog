import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Definer grenser for hver klasse
const limits: Record<string, { normal: number; turbo?: number }> = {
  "GT5": { normal: 7.3 },
  "GT4": { normal: 4.9, turbo: 5.5 },
  "GT3": { normal: 3.7, turbo: 4.0 },
  "GT1": { normal: 2.5 },
  "GT_PLUS": { normal: 1.0 },
  "OTHER": { normal: 0.0 },
};

const powerlogSchema = z.object({
  startNumber: z.string(),
  heatNumber: z.string(),
  weight: z.number(),
  nullPoint: z.number(),
  boxId: z.string(),
  measuredPower: z.number(),
});

export const powerlogRouter = createTRPCRouter({
  // Hent alle powerlog-oppføringer
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.powerlog.findMany({
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
  }),

  // Hent powerlog-oppføringer for en spesifikk selvangivelse
  getByDeclarationId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.powerlog.findMany({
        where: { declarationId: input },
        include: {
          declaration: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // Hent powerlog-oppføringer for en spesifikk heat
  getByHeat: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.powerlog.findMany({
        where: { heatNumber: input },
        include: {
          declaration: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  // Opprett ny powerlog-oppføring
  create: protectedProcedure
    .input(powerlogSchema)
    .mutation(async ({ ctx, input }) => {
      // Finn selvangivelsen basert på startnummer
      const declaration = await ctx.db.declaration.findFirst({
        where: { startNumber: input.startNumber },
        orderBy: { createdAt: "desc" },
      });

      if (!declaration) {
        throw new Error("Ingen selvangivelse funnet for dette startnummeret");
      }

      // Opprett powerlog-oppføringen
      return ctx.db.powerlog.create({
        data: {
          heatNumber: input.heatNumber,
          weight: input.weight,
          boxId: input.boxId,
          nullPoint: input.nullPoint,
          measuredPower: input.measuredPower,
          declarationId: declaration.id,
        },
        include: {
          declaration: true,
        },
      });
    }),

  // Oppdater målt effekt for en powerlog-oppføring
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        measuredPower: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const powerlog = await ctx.db.powerlog.update({
        where: { id: input.id },
        data: { measuredPower: input.measuredPower },
        include: {
          declaration: {
            include: {
              car: true,
            },
          },
        },
      });

      return powerlog;
    }),
}); 