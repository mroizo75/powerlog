import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@powerlogg.no";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";
const adminName = process.env.ADMIN_NAME ?? "Admin";

const run = async () => {
  if (!adminEmail || !adminPassword) {
    throw new Error("Mangler ADMIN_EMAIL eller ADMIN_PASSWORD");
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      role: "ADMIN",
      isAdmin: true,
      password: hashedPassword,
    },
    create: {
      name: adminName,
      email: adminEmail,
      role: "ADMIN",
      isAdmin: true,
      password: hashedPassword,
    },
  });

  console.log(`Admin-bruker er seedet: ${adminEmail}`);
};

run()
  .catch((error) => {
    console.error("Feil ved seeding av admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
