import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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
              weightAdditions: true,
            },
          },
          weightMeasurements: true,
        },
      });

      // Beregn vekt/effekt-ratio
      if (powerlog.weightMeasurements?.[0] && powerlog.declaration) {
        const declaredWeight = powerlog.declaration.declaredWeight;
        const declaredPower = powerlog.declaration.declaredPower;

        if (declaredWeight && declaredPower) {
          const actualRatio = powerlog.weightMeasurements[0].measuredWeight / input.measuredPower;
          const declaredRatio = declaredWeight / declaredPower;

          // Sjekk om ratioen er utenfor grensen
          if (actualRatio < declaredRatio) {
            // Sjekk om det allerede finnes en rapport for denne bilen og målingen
            const existingReport = await ctx.db.report.findFirst({
              where: {
                declarationId: powerlog.declaration.id,
                type: "POWERLOG_WEIGHT_POWER_RATIO",
                status: "PENDING",
                createdAt: {
                  gte: new Date(Date.now() - 1000 * 60 * 5), // Sjekk rapporter fra de siste 5 minuttene
                },
              },
            });

            // Hvis det ikke finnes en eksisterende rapport, opprett en ny
            if (!existingReport) {
              await ctx.db.report.create({
                data: {
                  type: "POWERLOG_WEIGHT_POWER_RATIO",
                  declarationId: powerlog.declaration.id,
                  status: "PENDING",
                  source: "POWERLOG",
                  createdById: ctx.session.user.id,
                  details: JSON.stringify({
                    measuredWeight: powerlog.weightMeasurements[0].measuredWeight,
                    measuredPower: input.measuredPower,
                    ratio: actualRatio,
                    requiredRatio: declaredRatio,
                    carInfo: `${powerlog.declaration.car.make} ${powerlog.declaration.car.model} (${powerlog.declaration.car.year})`,
                    startNumber: powerlog.declaration.startNumber,
                  }),
                },
              });
            }
          }
        }
      }

      return powerlog;
    }),
}); 