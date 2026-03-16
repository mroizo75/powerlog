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
  measuredPower: z.number().optional(),
  boxId: z.string().optional(),
  heatNumber: z.string().optional(),
  nullPoint: z.number().optional(),
});

const reportSchema = z.object({
  declarationId: z.string(),
  type: z.enum(["WEIGHT_POWER_RATIO"]),
  source: z.enum(["WEIGHT", "POWERLOG"]),
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
            source: input.source,
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
              // Her må vi sikre at measuredPower bevares i det parsede objektet
              // Logg det parsede objektet for debugging
              console.log('Parsert rapportdetaljer:', parsed);
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
      resolution: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const report = await ctx.db.report.update({
          where: { id: input.id },
          data: { 
            status: input.status,
            handledById: ctx.session.user.id,
            resolution: input.resolution,
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

  updateJuryStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      sentToJury: z.boolean(),
      juryComment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const report = await ctx.db.report.update({
          where: { id: input.id },
          data: { 
            sentToJury: input.sentToJury,
            juryComment: input.juryComment,
            handledById: ctx.session.user.id,
          },
        });

        return report;
      } catch (error) {
        console.error("Feil ved oppdatering av juryrapport:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Kunne ikke oppdatere juryrapport",
        });
      }
    }),

  getCarStats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Hent alle rapporter med nødvendige relasjoner
        const reports = await ctx.db.report.findMany({
          include: {
            declaration: {
              include: {
                car: true,
              },
            },
            createdBy: true,
            handledBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Gruppér rapporter etter bil
        const carStats: Record<string, any> = {};

        for (const report of reports) {
          if (!report.declaration?.car) continue;

          const carId = report.declaration.car.id;
          const carInfo = `${report.declaration.car.make} ${report.declaration.car.model} (${report.declaration.car.year})`;
          const startNumber = report.declaration.startNumber;

          // Parse details hvis det er en streng
          let reportDetails: any = report.details;
          try {
            if (typeof reportDetails === 'string') {
              reportDetails = JSON.parse(reportDetails);
            }
          } catch (e) {
            console.error('Kunne ikke parse rapportdetaljer:', e);
            reportDetails = {
              error: "Kunne ikke parse rapportdetaljer"
            };
          }

          // Initialiser bil-stat hvis den ikke finnes
          if (!carStats[carId]) {
            carStats[carId] = {
              carId,
              carInfo,
              startNumber,
              totalReports: 0,
              pendingReports: 0,
              resolvedReports: 0,
              rejectedReports: 0,
              reports: [],
            };
          }

          // Oppdater tellere
          carStats[carId].totalReports++;
          if (report.status === "pending") carStats[carId].pendingReports++;
          if (report.status === "resolved") carStats[carId].resolvedReports++;
          if (report.status === "rejected") carStats[carId].rejectedReports++;

          // Legg til rapporten i listen
          carStats[carId].reports.push({
            id: report.id,
            status: report.status,
            createdAt: report.createdAt,
            source: report.source,
            resolution: report.resolution,
          });
        }

        return carStats;
      } catch (error) {
        console.error("Feil ved henting av rapportstatistikk:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Kunne ikke hente rapportstatistikk",
        });
      }
    }),

  getArchived: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.archivedReport.findMany({
      include: {
        declaration: {
          include: {
            car: true,
          },
        },
        handledBy: true,
        createdBy: true,
      },
      orderBy: {
        archivedAt: "desc",
      },
    });
  }),

  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const report = await ctx.db.report.findUnique({
        where: { id: input.id },
        include: {
          declaration: true,
          handledBy: true,
          createdBy: true,
        },
      });

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rapport ikke funnet",
        });
      }

      // Opprett arkivert rapport
      await ctx.db.archivedReport.create({
        data: {
          type: report.type,
          status: report.status,
          source: report.source,
          details: report.details,
          resolution: report.resolution,
          sentToJury: report.sentToJury,
          juryComment: report.juryComment,
          declarationId: report.declarationId,
          handledById: report.handledById,
          createdById: report.createdById,
        },
      });

      // Slett den originale rapporten
      await ctx.db.report.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  archiveAll: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Finn alle rapporter
      const reports = await ctx.db.report.findMany({
        include: {
          declaration: true,
          handledBy: true,
          createdBy: true,
        }
      });

      // Arkiver hver rapport
      for (const report of reports) {
        await ctx.db.archivedReport.create({
          data: {
            type: report.type,
            status: report.status,
            source: report.source,
            details: report.details,
            resolution: report.resolution,
            sentToJury: report.sentToJury,
            juryComment: report.juryComment,
            declarationId: report.declarationId,
            createdById: report.createdById,
            handledById: report.handledById,
          },
        });

        await ctx.db.report.delete({
          where: { id: report.id },
        });
      }

      return { archivedCount: reports.length };
    }),
}); 