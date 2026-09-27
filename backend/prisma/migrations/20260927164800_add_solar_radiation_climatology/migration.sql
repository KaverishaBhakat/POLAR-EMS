-- CreateTable
CREATE TABLE "solar_radiation_climatology" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "radiationValue" DOUBLE PRECISION,
    "irradianceWm2" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'radiation(2).txt',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solar_radiation_climatology_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solar_radiation_climatology_month_hour_idx" ON "solar_radiation_climatology"("month", "hour");

-- CreateIndex
CREATE INDEX "solar_radiation_climatology_year_month_hour_idx" ON "solar_radiation_climatology"("year", "month", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "solar_radiation_climatology_year_month_hour_key" ON "solar_radiation_climatology"("year", "month", "hour");
