import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const run = async () => {
  const [users, cars, declarations, weights, powerlogs, reports, boxlogs, archivedReports] =
    await Promise.all([
      prisma.user.count(),
      prisma.car.count(),
      prisma.declaration.count(),
      prisma.weightMeasurement.count(),
      prisma.powerlog.count(),
      prisma.report.count(),
      prisma.boxLog.count(),
      prisma.archivedReport.count(),
    ]);

  console.log(
    JSON.stringify(
      { users, cars, declarations, weights, powerlogs, reports, boxlogs, archivedReports },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error("Feil ved verifisering av demo-data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
