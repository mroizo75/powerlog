import { DeclarationClass, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const defaultPassword = process.env.DEMO_PASSWORD ?? "Demo123!";

const demoUsers = [
  { name: "Admin Demo", email: "admin@powerlogg.no", role: "ADMIN", isAdmin: true },
  { name: "Teknisk Demo", email: "teknisk@powerlogg.no", role: "TEKNISK", isAdmin: false },
  { name: "Vektreg Demo", email: "vektreg@powerlogg.no", role: "VEKTREG", isAdmin: false },
  { name: "Innsjekk Demo", email: "innsjekk@powerlogg.no", role: "INNSJEKK", isAdmin: false },
  { name: "Powerlog Demo", email: "powerlog@powerlogg.no", role: "POWERLOG", isAdmin: false },
  { name: "Fører Demo", email: "driver@powerlogg.no", role: "USER", isAdmin: false },
];

const run = async () => {
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const usersByEmail = {};

  for (const user of demoUsers) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
        password: hashedPassword,
      },
      create: {
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        password: hashedPassword,
      },
    });

    usersByEmail[user.email] = upsertedUser;
  }

  await prisma.archivedReport.deleteMany();
  await prisma.report.deleteMany();
  await prisma.archivedWeightMeasurement.deleteMany();
  await prisma.weightMeasurement.deleteMany();
  await prisma.powerlog.deleteMany();
  await prisma.boxLog.deleteMany();
  await prisma.weightAddition.deleteMany();
  await prisma.declaration.deleteMany();
  await prisma.car.deleteMany();

  const carOne = await prisma.car.create({
    data: {
      make: "BMW",
      model: "M3 E46",
      year: 2004,
      registration: "DEMO504",
    },
  });

  const carTwo = await prisma.car.create({
    data: {
      make: "Porsche",
      model: "911 GT3",
      year: 2011,
      registration: "DEMO305",
    },
  });

  const carThree = await prisma.car.create({
    data: {
      make: "Toyota",
      model: "Supra",
      year: 1998,
      registration: "DEMO118",
    },
  });

  const declarationOne = await prisma.declaration.create({
    data: {
      startNumber: "504",
      email: "driver@powerlogg.no",
      declaredClass: DeclarationClass.GT4,
      declaredWeight: 1190,
      declaredPower: 210,
      isTurbo: true,
      carId: carOne.id,
      userId: usersByEmail["driver@powerlogg.no"].id,
      weightAdditions: {
        create: [
          { additionId: "driver-weight", weight: 20 },
          { additionId: "turbo-penalty", weight: 15 },
        ],
      },
    },
    include: { weightAdditions: true },
  });

  const declarationTwo = await prisma.declaration.create({
    data: {
      startNumber: "305",
      email: "driver@powerlogg.no",
      declaredClass: DeclarationClass.GT3,
      declaredWeight: 1480,
      declaredPower: 400,
      isTurbo: false,
      carId: carTwo.id,
      userId: usersByEmail["driver@powerlogg.no"].id,
      weightAdditions: {
        create: [{ additionId: "ballast", weight: 15 }],
      },
    },
  });

  const declarationThree = await prisma.declaration.create({
    data: {
      startNumber: "118",
      email: "driver@powerlogg.no",
      declaredClass: DeclarationClass.GT5,
      declaredWeight: 1270,
      declaredPower: 170,
      isTurbo: false,
      carId: carThree.id,
      userId: usersByEmail["driver@powerlogg.no"].id,
    },
  });

  const powerlogOne = await prisma.powerlog.create({
    data: {
      declarationId: declarationOne.id,
      heatNumber: "Kval",
      weight: 1182,
      boxId: "BOX-101",
      nullPoint: 0,
      measuredPower: 208,
    },
  });

  const powerlogTwo = await prisma.powerlog.create({
    data: {
      declarationId: declarationTwo.id,
      heatNumber: "Finale 1",
      weight: 1475,
      boxId: "BOX-202",
      nullPoint: 0,
      measuredPower: 398,
    },
  });

  await prisma.weightMeasurement.create({
    data: {
      declarationId: declarationOne.id,
      carId: carOne.id,
      measuredWeight: 1186,
      nullPoint: 0,
      heat: "Kval",
      powerlogId: powerlogOne.id,
      measuredById: usersByEmail["vektreg@powerlogg.no"].id,
      metadata: JSON.stringify({
        declaredPower: declarationOne.declaredPower,
        declaredWeight: declarationOne.declaredWeight,
        declaredClass: declarationOne.declaredClass,
        isTurbo: declarationOne.isTurbo,
        totalAdditionalWeight: declarationOne.weightAdditions.reduce((sum, w) => sum + w.weight, 0),
        weightPowerRatio: 5.65,
        requiredRatio: 5.5,
        isWithinLimit: true,
      }),
    },
  });

  const weightMeasurementTwo = await prisma.weightMeasurement.create({
    data: {
      declarationId: declarationTwo.id,
      carId: carTwo.id,
      measuredWeight: 1450,
      nullPoint: 0,
      heat: "Finale 1",
      powerlogId: powerlogTwo.id,
      measuredById: usersByEmail["vektreg@powerlogg.no"].id,
      metadata: JSON.stringify({
        declaredPower: declarationTwo.declaredPower,
        declaredWeight: declarationTwo.declaredWeight,
        declaredClass: declarationTwo.declaredClass,
        isTurbo: declarationTwo.isTurbo,
        totalAdditionalWeight: 15,
        weightPowerRatio: 3.66,
        requiredRatio: 3.7,
        isWithinLimit: false,
      }),
    },
  });

  await prisma.weightMeasurement.create({
    data: {
      declarationId: declarationThree.id,
      carId: carThree.id,
      measuredWeight: 1285,
      nullPoint: 0,
      heat: "Trening",
      measuredById: usersByEmail["vektreg@powerlogg.no"].id,
      metadata: JSON.stringify({
        declaredPower: declarationThree.declaredPower,
        declaredWeight: declarationThree.declaredWeight,
        declaredClass: declarationThree.declaredClass,
        isTurbo: declarationThree.isTurbo,
        totalAdditionalWeight: 0,
        weightPowerRatio: 7.56,
        requiredRatio: 7.3,
        isWithinLimit: true,
      }),
    },
  });

  await prisma.report.create({
    data: {
      type: "WEIGHT_POWER_RATIO",
      status: "pending",
      source: "WEIGHT",
      details: JSON.stringify({
        measuredWeight: weightMeasurementTwo.measuredWeight,
        declaredPower: declarationTwo.declaredPower,
        ratio: 3.66,
        requiredRatio: 3.7,
        carInfo: `${carTwo.make} ${carTwo.model} (${carTwo.year})`,
        startNumber: declarationTwo.startNumber,
      }),
      declarationId: declarationTwo.id,
      createdById: usersByEmail["vektreg@powerlogg.no"].id,
      handledById: usersByEmail["teknisk@powerlogg.no"].id,
      juryComment: "Demo-rapport for test av flyt.",
      sentToJury: true,
    },
  });

  await prisma.boxLog.create({
    data: {
      startNumber: declarationOne.startNumber,
      boxId: "BOX-101",
      declarationId: declarationOne.id,
      createdById: usersByEmail["vektreg@powerlogg.no"].id,
      isActive: true,
    },
  });

  await prisma.boxLog.create({
    data: {
      startNumber: declarationTwo.startNumber,
      boxId: "BOX-202",
      declarationId: declarationTwo.id,
      createdById: usersByEmail["vektreg@powerlogg.no"].id,
      isActive: true,
    },
  });

  const reportToArchive = await prisma.report.create({
    data: {
      type: "WEIGHT_POWER_RATIO",
      status: "resolved",
      source: "WEIGHT",
      details: JSON.stringify({
        measuredWeight: 1490,
        declaredPower: 400,
        ratio: 3.73,
        requiredRatio: 3.7,
        carInfo: `${carTwo.make} ${carTwo.model} (${carTwo.year})`,
        startNumber: declarationTwo.startNumber,
      }),
      declarationId: declarationTwo.id,
      createdById: usersByEmail["vektreg@powerlogg.no"].id,
      handledById: usersByEmail["teknisk@powerlogg.no"].id,
      resolution: "Løst i demo-seed",
    },
  });

  await prisma.archivedReport.create({
    data: {
      type: reportToArchive.type,
      status: "resolved",
      source: reportToArchive.source,
      details: reportToArchive.details,
      resolution: reportToArchive.resolution,
      sentToJury: reportToArchive.sentToJury,
      juryComment: reportToArchive.juryComment,
      declarationId: reportToArchive.declarationId,
      createdById: reportToArchive.createdById,
      handledById: reportToArchive.handledById,
    },
  });

  await prisma.report.delete({
    where: { id: reportToArchive.id },
  });

  console.log("Demo-seed ferdig.");
  console.log(`Innlogging passord for demo-brukere: ${defaultPassword}`);
  console.log("Brukere:");
  for (const user of demoUsers) {
    console.log(`- ${user.email} (${user.role})`);
  }
};

run()
  .catch((error) => {
    console.error("Feil ved demo-seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
