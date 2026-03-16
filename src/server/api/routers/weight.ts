import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { CLASS_LIMITS, getRequiredRatio } from "@/config/classLimits";

// Valideringsskjema for vektmåling
const weightMeasurementSchema = z.object({
  declarationId: z.string(),
  measuredWeight: z.number(),
  nullPoint: z.number().optional(),
  powerlogId: z.string().optional(),
  heat: z.enum(["Trening", "Kval", "Finale 1", "Finale 2", "Finale 3", "Finale 4"]).optional(),
  measuredById: z.string(),
});

export const weightRouter = createTRPCRouter({
  // Registrer ny vektmåling
  submit: protectedProcedure
    .input(weightMeasurementSchema)
    .mutation(async ({ ctx, input }) => {
      // Hent selvangivelsen for å sjekke om det er en GT-klasse
      const declaration = await ctx.db.declaration.findUnique({
        where: { id: input.declarationId },
        include: { 
          car: true,
          weightAdditions: true 
        },
      });

      if (!declaration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Selvangivelse ikke funnet",
        });
      }

      // Sjekk om det er en GT-klasse
      const isGTClass = ["GT5", "GT4", "GT3", "GT1", "GT_PLUS"].includes(declaration.declaredClass);

      let powerlogId: string | undefined;

      // Hvis det er en GT-klasse og vi har både boxId og nullpunkt, opprett Powerlog-oppføring
      if (isGTClass && input.powerlogId && input.heat) {
        const powerlog = await ctx.db.powerlog.create({
          data: {
            heatNumber: input.heat,
            weight: input.measuredWeight,
            boxId: input.powerlogId,
            nullPoint: input.nullPoint ?? 0,
            declarationId: input.declarationId,
          },
        });
        powerlogId = powerlog.id;
      }

      // Beregn total tilleggsvekt
      const totalAdditionalWeight = declaration.weightAdditions.reduce((sum, addition) => sum + addition.weight, 0);

      // Beregn vekt/effekt-ratio
      const weightPowerRatio = (input.measuredWeight + totalAdditionalWeight) / (declaration.declaredPower || 1);
      const requiredRatio = getRequiredRatio(declaration.declaredClass, declaration.isTurbo);
      const isWithinLimit = weightPowerRatio >= requiredRatio;

      // Opprett vektmålingen med all nødvendig informasjon
      const measurement = await ctx.db.weightMeasurement.create({
        data: {
          declarationId: input.declarationId,
          carId: declaration.carId,
          measuredWeight: input.measuredWeight,
          nullPoint: input.nullPoint ?? 0,
          powerlogId: powerlogId,
          measuredById: input.measuredById,
          heat: input.heat,
          // Lagre beregnede verdier for historikk
          metadata: JSON.stringify({
            declaredPower: declaration.declaredPower,
            declaredWeight: declaration.declaredWeight,
            declaredClass: declaration.declaredClass,
            isTurbo: declaration.isTurbo,
            totalAdditionalWeight,
            weightPowerRatio,
            requiredRatio,
            isWithinLimit,
            declarationDate: declaration.createdAt,
          }),
        },
      });

      // Hvis vekt/effekt-ratio er under grensen, generer en rapport
      if (!isWithinLimit) {
        // Sjekk om det allerede finnes en rapport for denne bilen og målingen
        const existingReport = await ctx.db.report.findFirst({
          where: {
            declarationId: input.declarationId,
            type: "WEIGHT_POWER_RATIO",
            status: "pending",
            createdAt: {
              gte: new Date(Date.now() - 1000 * 60 * 5), // Sjekk rapporter fra de siste 5 minuttene
            },
          },
        });

        // Hvis det ikke finnes en eksisterende rapport, opprett en ny
        if (!existingReport) {
          await ctx.db.report.create({
            data: {
              type: "WEIGHT_POWER_RATIO",
              status: "pending",
              source: "WEIGHT",
              details: JSON.stringify({
                measuredWeight: input.measuredWeight,
                declaredPower: declaration.declaredPower,
                ratio: weightPowerRatio,
                requiredRatio,
                carInfo: `${declaration.car.make} ${declaration.car.model} (${declaration.car.year})`,
                startNumber: declaration.startNumber,
              }),
              declarationId: input.declarationId,
              createdById: ctx.session.user.id,
            },
          });
        }
      }

      return measurement;
    }),

  // Hent vektmåling for en selvangivelse
  getByDeclarationId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.weightMeasurement.findMany({
        where: { declarationId: input },
        include: {
          measuredBy: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByCarId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.weightMeasurement.findMany({
        where: { carId: input },
        include: {
          measuredBy: true,
          declaration: true,
          powerlog: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Hent alle vektmålinger
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.weightMeasurement.findMany({
      include: {
        declaration: true,
        powerlog: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // Beregn vekt/effekt-ratio for en selvangivelse
  calculateWeightPowerRatio: protectedProcedure
    .input(z.object({
      declarationId: z.string(),
      measuredWeight: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const declaration = await ctx.db.declaration.findUnique({
        where: { id: input.declarationId },
        include: { car: true },
      });

      if (!declaration) {
        throw new Error("Selvangivelse ikke funnet");
      }

      if (declaration.declaredClass === "OTHER" || !declaration.declaredPower) {
        return {
          weightPowerRatio: null,
          classLimit: null,
          isWithinLimit: null,
          declaredPower: null,
          declaredClass: declaration.declaredClass,
        };
      }

      const weightPowerRatio = input.measuredWeight / declaration.declaredPower;
      const limit = getRequiredRatio(declaration.declaredClass, declaration.isTurbo);
      const isWithinLimit = weightPowerRatio <= limit;

      return {
        weightPowerRatio,
        classLimit: limit,
        isWithinLimit,
        declaredPower: declaration.declaredPower,
        declaredClass: declaration.declaredClass,
      };
    }),

  getArchived: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.archivedWeightMeasurement.findMany({
        include: {
          declaration: {
            include: {
              car: true,
            },
          },
          measuredBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const measurement = await ctx.db.weightMeasurement.findUnique({
        where: { id: input.id },
        include: {
          declaration: {
            include: {
              car: true,
            },
          },
          measuredBy: true,
        },
      });

      if (!measurement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vektmåling ikke funnet",
        });
      }

      await ctx.db.archivedWeightMeasurement.create({
        data: {
          declarationId: measurement.declarationId,
          carId: measurement.carId,
          measuredWeight: measurement.measuredWeight,
          nullPoint: measurement.nullPoint,
          heat: measurement.heat,
          measuredById: measurement.measuredById,
          powerlogId: measurement.powerlogId,
          metadata: measurement.metadata,
        },
      });

      await ctx.db.weightMeasurement.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  archiveAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      const measurements = await ctx.db.weightMeasurement.findMany({
        include: {
          declaration: {
            include: {
              car: true,
            },
          },
          measuredBy: true,
        },
      });

      for (const measurement of measurements) {
        await ctx.db.archivedWeightMeasurement.create({
          data: {
            declarationId: measurement.declarationId,
            carId: measurement.carId,
            measuredWeight: measurement.measuredWeight,
            nullPoint: measurement.nullPoint,
            heat: measurement.heat,
            measuredById: measurement.measuredById,
            powerlogId: measurement.powerlogId,
            metadata: measurement.metadata,
          },
        });

        await ctx.db.weightMeasurement.delete({
          where: { id: measurement.id },
        });
      }

      return { archivedCount: measurements.length };
    }),
}); 