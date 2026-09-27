-- CreateTable
CREATE TABLE "solar_generation_history" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "irradianceWm2" DOUBLE PRECISION,
    "solarPowerKW" DOUBLE PRECISION,
    "solarSource" TEXT NOT NULL DEFAULT 'CLIMATOLOGICAL_ESTIMATE',
    "modelVersion" TEXT DEFAULT 'IEC-61724-1-CLIMATOLOGY-V1',
    "pvCapacityKw" DOUBLE PRECISION,
    "performanceRatio" DOUBLE PRECISION,
    "sourceRadiationYear" INTEGER,
    "sourceRadiationMonth" INTEGER,
    "sourceRadiationHour" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solar_generation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solar_generation_history_stationId_timestamp_idx" ON "solar_generation_history"("stationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "solar_generation_history_stationId_timestamp_key" ON "solar_generation_history"("stationId", "timestamp");

-- AddForeignKey
ALTER TABLE "solar_generation_history" ADD CONSTRAINT "solar_generation_history_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
