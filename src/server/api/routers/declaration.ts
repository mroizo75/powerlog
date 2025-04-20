import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { DeclarationClass as PrismaDeclarationClass } from "@prisma/client";
import { WEIGHT_ADDITIONS } from "@/config/weightAdditions";
import { TRPCError } from "@trpc/server";

// Definer klasser lokalt
const DeclarationClass = {
  GT5: "GT5",
  GT4: "GT4",
  GT3: "GT3",
  GT1: "GT1",
  GT_PLUS: "GT_PLUS",
  OTHER: "OTHER",
} as const;

type DeclarationClass = typeof DeclarationClass[keyof typeof DeclarationClass];

// Valideringsskjema for bil
const carSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number(),
  registration: z.string().optional(),
});

// Valideringsskjema for selvangivelse
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

export const declarationRouter = createTRPCRouter({
  // Send inn ny selvangivelse
  submit: publicProcedure
    .input(
      z.object({
        startNumber: z.string(),
        email: z.string().email({ message: "Ugyldig e-postadresse" }),
        car: z.object({
          make: z.string().min(1, { message: "Bilmerke er påkrevd" }),
          model: z.string().min(1, { message: "Bilmodell er påkrevd" }),
          year: z.number().min(1900).max(new Date().getFullYear()),
        }),
        declaredWeight: z.number().min(0),
        declaredPower: z.number().min(0),
        declaredClass: z.enum([
          "GT5",
          "GT4",
          "GT3",
          "GT1",
          "GT_PLUS",
          "OTHER",
        ]),
        weightAdditions: z.array(z.string()),
        isTurbo: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Finn eller opprett bil basert på registreringsnummer
      let car;
      if (input.car.registration) {
        car = await ctx.db.car.findFirst({
          where: {
            registration: input.car.registration,
          },
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
          where: {
            id: car.id,
          },
          data: {
            make: input.car.make,
            model: input.car.model,
            year: input.car.year,
          },
        });
      }

      // For GT-klasser, finn eksisterende selvangivelse for dette startnummeret og klassen
      if (input.declaredClass !== "OTHER") {
        const existingDeclaration = await ctx.db.declaration.findFirst({
          where: {
            startNumber: input.startNumber,
            declaredClass: input.declaredClass,
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (existingDeclaration) {
          // Oppdater den eksisterende selvangivelsen
          const declaration = await ctx.db.declaration.update({
            where: { id: existingDeclaration.id },
            data: {
              declaredWeight: input.declaredWeight ?? 0,
              declaredPower: input.declaredPower ?? 0,
              isTurbo: input.isTurbo ?? false,
              weightAdditions: {
                deleteMany: {}, // Slett alle eksisterende tillegg
                create: input.weightAdditions?.map(additionId => ({
                  additionId,
                  weight: WEIGHT_ADDITIONS[input.declaredClass]?.find((a: { id: string; weight: number }) => a.id === additionId)?.weight ?? 0,
                })) ?? [],
              },
            },
            include: {
              car: true,
              weightAdditions: true,
            },
          });

          // Send e-postkvittering hvis e-postadresse er oppgitt
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
            } catch (error) {
              console.error("Feil ved sending av e-postkvittering:", error);
              // Fortsett selv om e-post-sending feiler
            }
          }

          return declaration;
        }

        // Hvis ingen eksisterende selvangivelse finnes, opprett ny
        const declaration = await ctx.db.declaration.create({
          data: {
            startNumber: input.startNumber,
            email: input.email,
            declaredClass: input.declaredClass,
            declaredWeight: input.declaredWeight ?? 0,
            declaredPower: input.declaredPower ?? 0,
            isTurbo: input.isTurbo ?? false,
            weightAdditions: {
              create: input.weightAdditions?.map(additionId => ({
                additionId,
                weight: WEIGHT_ADDITIONS[input.declaredClass]?.find((a: { id: string; weight: number }) => a.id === additionId)?.weight ?? 0,
              })) ?? [],
            },
            carId: car.id,
          },
          include: {
            car: true,
            weightAdditions: true,
          },
        });

        // Send e-postkvittering for OTHER-klasse
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
          } catch (error) {
            console.error("Feil ved sending av e-postkvittering:", error);
            // Fortsett selv om e-post-sending feiler
          }
        }

        return declaration;
      }

      // Opprett ny selvangivelse (enten for OTHER-klasse eller hvis ingen eksisterende GT-selvangivelse)
      const declaration = await ctx.db.declaration.create({
        data: {
          startNumber: input.startNumber,
          email: input.email,
          declaredClass: input.declaredClass,
          declaredWeight: input.declaredWeight ?? 0,
          declaredPower: input.declaredPower ?? 0,
          isTurbo: input.isTurbo ?? false,
          weightAdditions: {
            create: input.weightAdditions?.map(additionId => ({
              additionId,
              weight: WEIGHT_ADDITIONS[input.declaredClass]?.find((a: { id: string; weight: number }) => a.id === additionId)?.weight ?? 0,
            })) ?? [],
          },
          carId: car.id,
        },
        include: {
          car: true,
          weightAdditions: true,
        },
      });

      // Send e-postkvittering for OTHER-klasse
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
        } catch (error) {
          console.error("Feil ved sending av e-postkvittering:", error);
          // Fortsett selv om e-post-sending feiler
        }
      }

      // Invalider spørringer
      await ctx.db.$transaction(async (tx) => {
        await tx.declaration.findMany();
        await tx.car.findMany();
      });

      return declaration;
    }),

  // Hent selvangivelse basert på startnummer
  getByStartNumber: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const declaration = await ctx.db.declaration.findFirst({
        where: {
          startNumber: input,
        },
        include: {
          car: true,
          weightAdditions: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return declaration;
    }),

  // Hent alle selvangivelser (for autoriserte brukere)
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.declaration.findMany({
      include: {
        car: true,
        weightMeasurements: {
          include: {
            measuredBy: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // Hent selvangivelse basert på startnummer og klasse
  getByStartNumberAndClass: publicProcedure
    .input(z.object({
      startNumber: z.string(),
      declaredClass: z.nativeEnum(PrismaDeclarationClass),
    }))
    .query(async ({ ctx, input }) => {
      const declaration = await ctx.db.declaration.findFirst({
        where: {
          startNumber: input.startNumber,
          declaredClass: input.declaredClass,
        },
        include: {
          car: true,
          weightAdditions: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return declaration;
    }),

  // Opprett ny selvangivelse
  create: protectedProcedure
    .input(declarationSchema)
    .mutation(async ({ ctx, input }) => {
      // Opprett eller finn bil
      const car = await ctx.db.car.upsert({
        where: {
          id: input.car.registration ?? "UNKNOWN",
        },
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
        include: {
          car: true,
        },
      });

      return declaration;
    }),

  // Hent selvangivelse basert på ID
  getById: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const declaration = await ctx.db.declaration.findUnique({
        where: { id: input },
        include: {
          car: true,
        },
      });

      return declaration;
    }),

  // Slett selvangivelse (kun for admin)
  delete: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      const declaration = await ctx.db.declaration.findUnique({
        where: { id: input },
        include: {
          weightMeasurements: true,
          weightAdditions: true,
        },
      });

      if (!declaration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Selvangivelse ikke funnet",
        });
      }

      // Sjekk om dette er den eneste selvangivelsen for dette startnummeret
      const otherDeclarations = await ctx.db.declaration.findMany({
        where: {
          startNumber: declaration.startNumber,
          declaredClass: declaration.declaredClass,
          id: { not: declaration.id },
        },
      });

      // Hvis dette er den eneste selvangivelsen, ikke slett den
      if (otherDeclarations.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Kan ikke slette den eneste selvangivelsen for dette startnummeret",
        });
      }

      // Finn den nyeste andre selvangivelsen
      const latestOtherDeclaration = otherDeclarations.reduce((latest, current) => 
        new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
      );

      // Oppdater alle vektmålinger til å bruke den nyeste andre selvangivelsen
      await ctx.db.weightMeasurement.updateMany({
        where: { declarationId: declaration.id },
        data: { declarationId: latestOtherDeclaration.id },
      });

      // Slett tilleggsvekter
      await ctx.db.weightAddition.deleteMany({
        where: { declarationId: declaration.id },
      });

      // Slett selvangivelsen
      return ctx.db.declaration.delete({
        where: { id: input },
      });
    }),
}); 