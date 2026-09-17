import { Station, StationId } from '../types';

export const STATIONS: Record<StationId, Station> = {
  maitri: {
    id: 'maitri',
    name: 'Maitri Research Station',
    hindiName: 'मैत्री अनुसंधान केंद्र',
    location: 'Schirmacher Oasis, Queen Maud Land, East Antarctica',
    coordinates: {
      lat: "70°45'57\" S",
      lng: "11°44'09\" E",
      latVal: -70.7658,
      lngVal: 11.7358,
    },
    elevation: '117 m above sea level',
    established: 1989,
    type: 'Inland Ice-Free Oasis Station',
    winterPopulation: 25,
    summerPopulation: 65,
    currentPersonnel: 38,
    status: 'OPERATIONAL',
    installedSolarKW: 100,
    installedWindKW: 80,
    batteryCapacityKWh: 500,
    generatorCapacityKVA: 375, // 3x 125 kVA Gensets
    generatorCount: 4,
    chpEnabled: false,
  },
  bharati: {
    id: 'bharati',
    name: 'Bharati Research Station',
    hindiName: 'भारती अनुसंधान केंद्र',
    location: 'Larsemann Hills, Princess Elizabeth Land, East Antarctica',
    coordinates: {
      lat: "69°24'28\" S",
      lng: "76°11'14\" E",
      latVal: -69.4078,
      lngVal: 76.1872,
    },
    elevation: '35 m above sea level',
    established: 2012,
    type: 'State-of-the-Art Modular Coastal Station',
    winterPopulation: 23,
    summerPopulation: 72,
    currentPersonnel: 44,
    status: 'OPERATIONAL',
    installedSolarKW: 150,
    installedWindKW: 120,
    batteryCapacityKWh: 600,
    generatorCapacityKVA: 450, // Ultra-modern CHP plant
    generatorCount: 4,
    chpEnabled: true,
  },
};
