import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const run = async () => {
  const user = await prisma.user.findUnique({
    where: { email: "admin@powerlogg.no" },
  });

  if (!user?.password) {
    console.log("Fant ikke admin-bruker med passord.");
    return;
  }

  const demoPassword = await bcrypt.compare("Demo123!", user.password);
  const adminPassword = await bcrypt.compare("Admin123!", user.password);

  console.log(
    JSON.stringify(
      {
        email: user.email,
        demoPassword,
        adminPassword,
      },
      null,
      2,
    ),
  );
};

run()
  .catch((error) => {
    console.error("Feil ved passordsjekk:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
