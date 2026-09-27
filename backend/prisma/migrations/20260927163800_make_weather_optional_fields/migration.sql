-- AlterTable
ALTER TABLE "weather_data" ALTER COLUMN "humidity" DROP NOT NULL,
ALTER COLUMN "windDirection" DROP NOT NULL,
ALTER COLUMN "solarRadiation" DROP NOT NULL;
