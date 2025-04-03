import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["ADMIN", "USER", "TEKNISK", "VEKTREG", "INNSJEKK", "POWERLOG"]),
});

export const adminRouter = createTRPCRouter({
  // Spesiell rute for å opprette den første admin-brukeren
  createFirstAdmin: publicProcedure
    .input(
      z.object({
        email: z.string().email("Ugyldig e-postadresse"),
        password: z.string().min(8, "Passordet må være minst 8 tegn"),
        name: z.string().min(1, "Navn er påkrevd"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Sjekk om det allerede finnes en admin
      const existingAdmin = await ctx.db.user.findFirst({
        where: { role: "ADMIN" },
      });

      if (existingAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Det finnes allerede en admin-bruker",
        });
      }

      // Sjekk om e-postadressen allerede er i bruk
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "E-postadressen er allerede i bruk",
        });
      }

      // Hash passordet
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Opprett admin-bruker
      const admin = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      };
    }),

  createAdmin: protectedProcedure
    .input(createAdminSchema)
    .mutation(async ({ ctx, input }) => {
      // Sjekk om brukeren allerede eksisterer
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bruker med denne e-postadressen eksisterer allerede",
        });
      }

      // Hash passordet
      const hashedPassword = await bcrypt.hash(input.password, 10);

      // Opprett ny admin-bruker
      const user = await ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }),

  // Hent alle admin-brukere
  getAllAdmins: protectedProcedure.query(async ({ ctx }) => {
    const admins = await ctx.db.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return admins;
  }),

  // Hent alle brukere
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return users;
  }),

  // Oppdater brukerrolle
  updateUserRole: protectedProcedure
    .input(updateUserRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }),

  // Hent systemstatistikk
  getSystemStats: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalUsers,
      activeSessions,
      totalDeclarations,
      weightMeasurementsToday,
      totalReports,
    ] = await Promise.all([
      // Totalt antall brukere
      ctx.db.user.count(),
      
      // Aktive sesjoner (sesjoner som ikke har utløpt)
      ctx.db.session.count({
        where: {
          expires: {
            gt: new Date(),
          },
        },
      }),
      
      // Totalt antall selvangivelser
      ctx.db.declaration.count(),
      
      // Vektmålinger i dag
      ctx.db.weightMeasurement.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      
      // Totalt antall rapporter
      ctx.db.report.count(),
    ]);

    // Hent systemlogg (dette er en forenklet versjon - i produksjon bør dette være en egen tabell)
    const systemLogs = [
      {
        timestamp: new Date(),
        level: "INFO",
        message: "System oppdatert",
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        level: "INFO",
        message: "Database backup fullført",
      },
      {
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        level: "ERROR",
        message: "Kunne ikke koble til ekstern tjeneste",
      },
    ];

    return {
      totalUsers,
      activeSessions,
      totalDeclarations,
      weightMeasurementsToday,
      totalReports,
      systemLogs,
    };
  }),

  // Oppdater admin-bruker
  updateAdmin: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        email: z.string().email().optional(),
        name: z.string().min(2).optional(),
        password: z.string().min(8).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Hvis passord skal oppdateres, hash det
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await ctx.db.user.update({
        where: { id },
        data: updateData,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }),

  // Slett admin-bruker
  deleteAdmin: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.delete({
        where: { id: input },
      });

      return { success: true };
    }),

  // Hent all bilinformasjon med relaterte data
  getAllCars: protectedProcedure
    .query(async ({ ctx }) => {
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
          createdAt: 'desc',
        },
      });

      return cars;
    }),
}); 