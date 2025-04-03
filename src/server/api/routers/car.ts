import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Valideringsskjema for bil
const carSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number(),
  registration: z.string().optional(),
});

export const carRouter = createTRPCRouter({
  // Hent alle biler med relaterte data
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const cars = await ctx.db.car.findMany({
      include: {
        declarations: {
          include: {
            weightMeasurements: {
              include: {
                measuredBy: {
                  select: {
                    name: true,
                    role: true,
                  },
                },
              },
            },
            reports: {
              include: {
                handledBy: {
                  select: {
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Konverter gamle dataformater til nytt format
    return cars.map(car => ({
      ...car,
      declarations: car.declarations.map(declaration => ({
        ...declaration,
        reports: declaration.reports.map(report => {
          try {
            // Hvis details er en streng, prøv å parse den som JSON
            if (typeof report.details === 'string') {
              const parsed = JSON.parse(report.details);
              if (parsed && typeof parsed === 'object') {
                return {
                  ...report,
                  details: parsed
                };
              }
            }
            return report;
          } catch (e) {
            console.error('Kunne ikke parse rapportdetaljer:', e);
            return report;
          }
        })
      }))
    }));
  }),

  // Hent en spesifikk bil
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const car = await ctx.db.car.findUnique({
        where: { id: input },
        include: {
          declarations: {
            include: {
              weightMeasurements: {
                include: {
                  measuredBy: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              weightAdditions: true,
            },
          },
        },
      });

      if (!car) {
        throw new Error("Bil ikke funnet");
      }

      return car;
    }),

  // Opprett ny bil
  create: protectedProcedure
    .input(carSchema)
    .mutation(async ({ ctx, input }) => {
      const car = await ctx.db.car.create({
        data: {
          make: input.make,
          model: input.model,
          year: input.year,
          registration: input.registration ?? undefined,
        },
      });

      return car;
    }),

  // Oppdater eksisterende bil
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      ...carSchema.shape,
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const car = await ctx.db.car.update({
        where: { id },
        data,
      });

      return car;
    }),

  // Slett bil
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const car = await ctx.db.car.delete({
        where: { id: input },
      });

      return car;
    }),
}); 