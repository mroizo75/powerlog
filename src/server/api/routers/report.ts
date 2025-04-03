import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

const reportDetailsSchema = z.object({
  measuredWeight: z.number(),
  declaredPower: z.number(),
  ratio: z.number(),
  requiredRatio: z.number(),
  carInfo: z.string(),
  startNumber: z.string(),
});

const reportSchema = z.object({
  declarationId: z.string(),
  type: z.enum(["WEIGHT_POWER_RATIO"]),
  details: reportDetailsSchema,
});

export const reportRouter = createTRPCRouter({
  create: protectedProcedure
    .input(reportSchema)
    .mutation(async ({ ctx, input }) => {
      const declaration = await ctx.db.declaration.findUnique({
        where: { id: input.declarationId },
        include: {
          car: true,
          user: true,
        },
      });

      if (!declaration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Selvangivelse ikke funnet",
        });
      }

      try {
        // Konverter details til JSON-streng før lagring
        const detailsString = JSON.stringify(input.details);
        
        // Opprett rapport
        const report = await ctx.db.report.create({
          data: {
            type: input.type,
            details: detailsString,
            declarationId: input.declarationId,
            createdById: ctx.session.user.id,
            status: "pending",
          },
        });

        // Send varsling til admin
        const admins = await ctx.db.user.findMany({
          where: { role: "ADMIN" },
        });

        // Her kan vi legge til e-postvarsling eller annen varslingsmekanisme senere
        console.log(`Rapport generert for ${declaration.car.make} ${declaration.car.model} (${declaration.startNumber})`);

        return report;
      } catch (error) {
        console.error("Feil ved oppretting av rapport:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Kunne ikke opprette rapport",
        });
      }
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    try {
      const reports = await ctx.db.report.findMany({
        include: {
          declaration: {
            include: {
              car: true,
              user: true,
            },
          },
          createdBy: true,
          handledBy: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Konverter gamle dataformater til nytt format
      return reports.map(report => {
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
          // Returner en standardisert feilmelding i details
          return {
            ...report,
            details: {
              measuredWeight: 0,
              declaredPower: 0,
              ratio: 0,
              requiredRatio: 0,
              carInfo: "Kunne ikke lese bilinformasjon",
              startNumber: "Kunne ikke lese startnummer",
              error: "Kunne ikke parse rapportdetaljer"
            }
          };
        }
      });
    } catch (error) {
      console.error("Feil ved henting av rapporter:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Kunne ikke hente rapporter",
      });
    }
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const report = await ctx.db.report.findUnique({
          where: { id: input.id },
          include: {
            declaration: {
              include: {
                car: true,
                user: true,
              },
            },
            createdBy: true,
            handledBy: true,
          },
        });

        if (!report) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Rapport ikke funnet",
          });
        }

        // Konverter gamle dataformater til nytt format
        try {
          if (typeof report.details === 'string') {
            const parsed = JSON.parse(report.details);
            if (parsed && typeof parsed === 'object') {
              return {
                ...report,
                details: parsed
              };
            }
          }
        } catch (e) {
          console.error('Kunne ikke parse rapportdetaljer:', e);
          // Returner en standardisert feilmelding i details
          return {
            ...report,
            details: {
              measuredWeight: 0,
              declaredPower: 0,
              ratio: 0,
              requiredRatio: 0,
              carInfo: "Kunne ikke lese bilinformasjon",
              startNumber: "Kunne ikke lese startnummer",
              error: "Kunne ikke parse rapportdetaljer"
            }
          };
        }

        return report;
      } catch (error) {
        console.error("Feil ved henting av rapport:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Kunne ikke hente rapport",
        });
      }
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "resolved", "rejected"]),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const report = await ctx.db.report.update({
          where: { id: input.id },
          data: { 
            status: input.status,
            handledById: ctx.session.user.id,
          },
        });

        return report;
      } catch (error) {
        console.error("Feil ved oppdatering av rapportstatus:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Kunne ikke oppdatere rapportstatus",
        });
      }
    }),
}); 