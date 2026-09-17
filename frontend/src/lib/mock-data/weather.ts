import { StationId, WeatherData } from '../types';

export const WEATHER_DATA: Record<StationId, WeatherData> = {
  maitri: {
    stationId: 'maitri',
    temperature: -24.8,
    apparentTemperature: -38.2, // Wind chill
    windSpeed: 16.4,
    windDirection: 'ESE (115°)',
    windGust: 24.8,
    humidity: 58,
    pressure: 978.4,
    solarRadiation: 385,
    visibility: '15 km (Clear)',
    blizzardRisk: 'LOW',
    condition: 'Cold & Gusty / Partial High Cirrus',
    uvIndex: 2.1,
  },
  bharati: {
    stationId: 'bharati',
    temperature: -18.2,
    apparentTemperature: -29.6,
    windSpeed: 12.8,
    windDirection: 'NE (045°)',
    windGust: 19.2,
    humidity: 64,
    pressure: 989.2,
    solarRadiation: 440,
    visibility: '25 km (Clear Coastal)',
    blizzardRisk: 'LOW',
    condition: 'Sunny / Maritime Polar High',
    uvIndex: 2.8,
  },
};
