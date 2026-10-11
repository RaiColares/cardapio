-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "establishments" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "authorized_emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorized_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authorized_emails_email_key" ON "authorized_emails"("email");

-- CreateIndex
CREATE INDEX "authorized_emails_createdAt_idx" ON "authorized_emails"("createdAt");

