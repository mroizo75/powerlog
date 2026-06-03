import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { DeclarationClass as PrismaDeclarationClass, type DeclarationClass } from "@prisma/client";
import { WEIGHT_ADDITIONS } from "@/config/weightAdditions";
import { TRPCError } from "@trpc/server";

const carSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number(),
  registration: z.string().optional(),
});

const declarationSchema = z.object({
  startNumber: z.string().min(1, "Startnummer er påkrevd"),
  declaredClass: z.nativeEnum(PrismaDeclarationClass),
  declaredWeight: z.number().optional(),
  declaredPower: z.number().optional(),
  isTurbo: z.boolean().optional(),
  email: z.string().email().optional(),
  car: carSchema,
  weightAdditions: z.array(z.string()).optional(),
});

const submitInputSchema = z.object({
  startNumber: z.string(),
  email: z.string().email({ message: "Ugyldig e-postadresse" }),
  car: z.object({
    make: z.string().min(1, { message: "Bilmerke er påkrevd" }),
    model: z.string().min(1, { message: "Bilmodell er påkrevd" }),
    year: z.number().min(1900).max(new Date().getFullYear()),
    registration: z.string().optional(),
  }),
  declaredWeight: z.number().min(0),
  declaredPower: z.number().min(0),
  declaredClass: z.enum(["GT5", "GT4", "GT3", "GT1", "GT_PLUS", "OTHER"]),
  weightAdditions: z.array(z.string()),
  isTurbo: z.boolean(),
});

type SubmitInput = z.infer<typeof submitInputSchema>;

function buildNewValues(input: SubmitInput) {
  return {
    declaredWeight: input.declaredWeight,
    declaredPower: input.declaredPower,
    declaredClass: input.declaredClass,
    isTurbo: input.isTurbo,
    weightAdditions: input.weightAdditions,
    car: { make: input.car.make, model: input.car.model, year: input.car.year },
  };
}

function computeChangedFields(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(next)) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changed.push(key);
    }
  }
  return changed;
}

function mapWeightAdditions(declaredClass: DeclarationClass, additionIds: string[]) {
  return additionIds.map((additionId) => ({
    additionId,
    weight:
      WEIGHT_ADDITIONS[declaredClass]?.find(
        (a: { id: string; weight: number }) => a.id === additionId,
      )?.weight ?? 0,
  }));
}

export const declarationRouter = createTRPCRouter({
  submit: publicProcedure
    .input(submitInputSchema)
    .mutation(async ({ ctx, input }) => {
      let car;
      if (input.car.registration) {
        car = await ctx.db.car.findFirst({
          where: { registration: input.car.registration },
        });
      }

      if (!car) {
        car = await ctx.db.car.create({
          data: {
            make: input.car.make,
            model: input.car.model,
            year: input.car.year,
            registration: input.car.registration ?? "UNKNOWN",
          },
        });
      } else {
        car = await ctx.db.car.update({
          where: { id: car.id },
          data: {
            make: input.car.make,
            model: input.car.model,
            year: input.car.year,
          },
        });
      }

      let declaration;

      if (input.declaredClass !== "OTHER") {
        const existingDeclaration = await ctx.db.declaration.findFirst({
          where: {
            startNumber: input.startNumber,
            declaredClass: input.declaredClass,
          },
          include: { weightAdditions: true },
          orderBy: { createdAt: "desc" },
        });

        if (existingDeclaration) {
          const previousValues = {
            declaredWeight: existingDeclaration.declaredWeight,
            declaredPower: existingDeclaration.declaredPower,
            declaredClass: existingDeclaration.declaredClass,
            isTurbo: existingDeclaration.isTurbo,
            weightAdditions: existingDeclaration.weightAdditions.map((a) => a.additionId),
            car: { make: car.make, model: car.model, year: car.year },
          };
          const newValues = buildNewValues(input);
          const changedFields = computeChangedFields(
            previousValues as unknown as Record<string, unknown>,
            newValues as unknown as Record<string, unknown>,
          );

          declaration = await ctx.db.declaration.update({
            where: { id: existingDeclaration.id },
            data: {
              declaredWeight: input.declaredWeight ?? 0,
              declaredPower: input.declaredPower ?? 0,
              isTurbo: input.isTurbo ?? false,
              weightAdditions: {
                deleteMany: {},
                create: mapWeightAdditions(input.declaredClass, input.weightAdditions),
              },
            },
            include: { car: true, weightAdditions: true },
          });

          await ctx.db.declarationAuditLog.create({
            data: {
              declarationId: declaration.id,
              startNumber: input.startNumber,
              action: "UPDATED",
              previousValues: JSON.stringify(previousValues),
              newValues: JSON.stringify(newValues),
              changedFields: JSON.stringify(changedFields),
              submittedByEmail: input.email,
            },
          });
        } else {
          declaration = await ctx.db.declaration.create({
            data: {
              startNumber: input.startNumber,
              email: input.email,
              declaredClass: input.declaredClass,
              declaredWeight: input.declaredWeight ?? 0,
              declaredPower: input.declaredPower ?? 0,
              isTurbo: input.isTurbo ?? false,
              weightAdditions: {
                create: mapWeightAdditions(input.declaredClass, input.weightAdditions),
              },
              carId: car.id,
            },
            include: { car: true, weightAdditions: true },
          });

          await ctx.db.declarationAuditLog.create({
            data: {
              declarationId: declaration.id,
              startNumber: input.startNumber,
              action: "CREATED",
              newValues: JSON.stringify(buildNewValues(input)),
              submittedByEmail: input.email,
            },
          });
        }
      } else {
        declaration = await ctx.db.declaration.create({
          data: {
            startNumber: input.startNumber,
            email: input.email,
            declaredClass: input.declaredClass,
            declaredWeight: input.declaredWeight ?? 0,
            declaredPower: input.declaredPower ?? 0,
            isTurbo: input.isTurbo ?? false,
            weightAdditions: {
              create: mapWeightAdditions(input.declaredClass, input.weightAdditions),
            },
            carId: car.id,
          },
          include: { car: true, weightAdditions: true },
        });

        await ctx.db.declarationAuditLog.create({
          data: {
            declarationId: declaration.id,
            startNumber: input.startNumber,
            action: "CREATED",
            newValues: JSON.stringify(buildNewValues(input)),
            submittedByEmail: input.email,
          },
        });
      }

      if (input.email) {
        try {
          await ctx.emailService.sendDeclarationReceipt({
            to: input.email,
            startNumber: input.startNumber,
            carInfo: `${input.car.make} ${input.car.model} (${input.car.year})`,
            declaredClass: input.declaredClass,
            declaredWeight: input.declaredWeight ?? 0,
            declaredPower: input.declaredPower ?? 0,
          });
        } catch {
          // Fortsett selv om e-post-sending feiler
        }
      }

      return declaration;
    }),

  getByStartNumber: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.declaration.findFirst({
        where: { startNumber: input },
        include: { car: true, weightAdditions: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.declaration.findMany({
      include: {
        car: true,
        weightMeasurements: { include: { measuredBy: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  getByStartNumberAndClass: publicProcedure
    .input(
      z.object({
        startNumber: z.string(),
        declaredClass: z.nativeEnum(PrismaDeclarationClass),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.declaration.findFirst({
        where: {
          startNumber: input.startNumber,
          declaredClass: input.declaredClass,
        },
        include: { car: true, weightAdditions: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  getAuditLog: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.declarationAuditLog.findMany({
        where: { startNumber: input },
        orderBy: { createdAt: "desc" },
        include: {
          declaration: {
            select: { declaredClass: true, car: { select: { make: true, model: true, year: true } } },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(declarationSchema)
    .mutation(async ({ ctx, input }) => {
      const car = await ctx.db.car.upsert({
        where: { id: input.car.registration ?? "UNKNOWN" },
        update: {
          make: input.car.make,
          model: input.car.model,
          year: input.car.year,
        },
        create: {
          make: input.car.make,
          model: input.car.model,
          year: input.car.year,
          registration: input.car.registration ?? "UNKNOWN",
        },
      });

      const declaration = await ctx.db.declaration.create({
        data: {
          startNumber: input.startNumber,
          declaredClass: input.declaredClass,
          declaredWeight: input.declaredWeight ?? 0,
          declaredPower: input.declaredPower ?? 0,
          isTurbo: input.isTurbo ?? false,
          carId: car.id,
        },
        include: { car: true },
      });

      return declaration;
    }),

  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return ctx.db.declaration.findUnique({
        where: { id: input },
        include: { car: true },
      });
    }),

  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const declaration = await ctx.db.declaration.findUnique({
        where: { id: input },
      });

      if (!declaration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Selvangivelse ikke funnet",
        });
      }

      return ctx.db.$transaction(async (tx) => {
        await tx.weightMeasurement.deleteMany({ where: { declarationId: declaration.id } });
        await tx.powerlog.deleteMany({ where: { declarationId: declaration.id } });
        await tx.report.deleteMany({ where: { declarationId: declaration.id } });
        await tx.boxLog.updateMany({ where: { declarationId: declaration.id }, data: { declarationId: null } });
        await tx.archivedReport.deleteMany({ where: { declarationId: declaration.id } });
        await tx.archivedWeightMeasurement.deleteMany({ where: { declarationId: declaration.id } });
        await tx.weightAddition.deleteMany({ where: { declarationId: declaration.id } });
        return tx.declaration.delete({ where: { id: declaration.id } });
      });
    }),
});
