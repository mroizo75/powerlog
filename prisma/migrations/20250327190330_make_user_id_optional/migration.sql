/*
  Warnings:

  - You are about to alter the column `declaredClass` on the `declaration` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.
  - A unique constraint covering the columns `[startNumber,declaredClass]` on the table `Declaration` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Declaration_startNumber_key` ON `declaration`;

-- AlterTable
ALTER TABLE `declaration` ADD COLUMN `isTurbo` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `userId` VARCHAR(191) NULL,
    MODIFY `declaredWeight` DOUBLE NULL,
    MODIFY `declaredPower` DOUBLE NULL,
    MODIFY `declaredClass` ENUM('GT5', 'GT4', 'GT3', 'GT1', 'GT_PLUS', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `report` ADD COLUMN `createdById` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `weightmeasurement` ADD COLUMN `heat` VARCHAR(191) NULL,
    MODIFY `nullPoint` DOUBLE NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Powerlog` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `heatNumber` VARCHAR(191) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `boxId` VARCHAR(191) NOT NULL,
    `nullPoint` DOUBLE NOT NULL,
    `declarationId` VARCHAR(191) NOT NULL,

    INDEX `Powerlog_declarationId_idx`(`declarationId`),
    INDEX `Powerlog_boxId_idx`(`boxId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Declaration_startNumber_declaredClass_key` ON `Declaration`(`startNumber`, `declaredClass`);

-- CreateIndex
CREATE INDEX `Report_createdById_idx` ON `Report`(`createdById`);

-- CreateIndex
CREATE INDEX `WeightMeasurement_powerlogId_idx` ON `WeightMeasurement`(`powerlogId`);

-- AddForeignKey
ALTER TABLE `Declaration` ADD CONSTRAINT `Declaration_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Powerlog` ADD CONSTRAINT `Powerlog_declarationId_fkey` FOREIGN KEY (`declarationId`) REFERENCES `Declaration`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WeightMeasurement` ADD CONSTRAINT `WeightMeasurement_powerlogId_fkey` FOREIGN KEY (`powerlogId`) REFERENCES `Powerlog`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `Report_handledById_idx` ON `Report`(`handledById`);

-- RedefineIndex
CREATE INDEX `WeightMeasurement_measuredById_idx` ON `WeightMeasurement`(`measuredById`);
