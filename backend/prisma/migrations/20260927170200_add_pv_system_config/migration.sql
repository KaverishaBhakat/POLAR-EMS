-- CreateTable
CREATE TABLE "pv_system_configs" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "capacityKw" DOUBLE PRECISION NOT NULL,
    "performanceRatio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pv_system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pv_system_configs_stationId_key" ON "pv_system_configs"("stationId");

-- AddForeignKey
ALTER TABLE "pv_system_configs" ADD CONSTRAINT "pv_system_configs_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
