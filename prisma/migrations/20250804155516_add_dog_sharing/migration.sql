/*
  Warnings:

  - You are about to drop the column `kennel_club_registration` on the `Dog` table. All the data in the column will be lost.
  - You are about to drop the column `medical_history` on the `Dog` table. All the data in the column will be lost.
  - The `personality_traits` column on the `Dog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."Dog" DROP COLUMN "kennel_club_registration",
DROP COLUMN "medical_history",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "personality_traits",
ADD COLUMN     "personality_traits" TEXT[],
ALTER COLUMN "vaccination_status" DROP DEFAULT,
ALTER COLUMN "spayed_neutered" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."DogShare" (
    "id" TEXT NOT NULL,
    "dog_id" TEXT NOT NULL,
    "share_token" TEXT NOT NULL,
    "share_type" TEXT NOT NULL DEFAULT 'public',
    "expires_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DogShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DogShare_share_token_key" ON "public"."DogShare"("share_token");

-- AddForeignKey
ALTER TABLE "public"."DogShare" ADD CONSTRAINT "DogShare_dog_id_fkey" FOREIGN KEY ("dog_id") REFERENCES "public"."Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
