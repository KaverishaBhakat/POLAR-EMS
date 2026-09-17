'use client';

import React from 'react';
import { ArrowDown, ArrowUp, Zap, Wind, Sun, Thermometer, ShieldAlert, Cpu } from 'lucide-react';

export const ForecastDrivers: React.FC = () => {
  const drivers = [
    {
      driver: 'Ambient Temperature Drop (-8°C)',
      icon: Thermometer,
      impact: 'Heating Demand Increase (+42 kW)',
      direction: 'UP',
      sensitivity: 'High (3.5 kW / °C)',
      description: 'Habitat hydronic freeze protection tracer lines draw additional heating power as temperatures fall.',
      color: 'rose',
    },
    {
      driver: 'Katabatic Wind Velocity Surge (+5 m/s)',
      icon: Wind,
      impact: 'Wind Generation Increase (+35 kW)',
      direction: 'UP',
      sensitivity: 'Moderate (7.0 kW / m/s)',
      description: 'Wind turbine output increases along cubic power curve up to rated 12 m/s velocity.',
      color: 'cyan',
    },
    {
      driver: 'Solar Irradiance Elevation Peak (385 W/m²)',
      icon: Sun,
      impact: 'Solar PV Generation Ramp (+45 kW)',
      direction: 'UP',
      sensitivity: 'Direct Linear (0.22 kW / (W/m²))',
      description: 'Bifacial solar modules capture direct Antarctic sun plus high albedo reflection from pristine snowfield.',
      color: 'amber',
    },
    {
      driver: 'Station Expedition Shift (Evening Shift)',
      icon: Cpu,
      impact: 'Base Operational Load Surge (+28 kW)',
      direction: 'UP',
      sensitivity: 'Medium (Scheduled Activity)',
      description: 'Laboratory spectrometers, core drill battery recharging, and galley cooking cycles active between 18:00–21:00.',
      color: 'blue',
    },
  ];

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="mb-4 pb-2.5 border-b border-[#1B2C42]/50">
        <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          AI Forecast Sensitivity Drivers & Correlation Matrix
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Physics relationships and environmental vectors driving the next 24-hour demand/generation forecasts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {drivers.map((d) => {
          const Icon = d.icon;
          const colorTheme = {
            rose: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
            cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
            amber: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
            blue: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
          }[d.color];

          return (
            <div
              key={d.driver}
              className={`p-3.5 rounded-lg border ${colorTheme} font-mono space-y-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="text-xs font-bold text-slate-100">{d.driver}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0A121E] border border-[#1B2C42] text-slate-300">
                  {d.sensitivity}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-[#080E17] p-2 rounded border border-[#1B2C42]/50">
                <ArrowUp size={14} className="text-emerald-400" />
                <span>{d.impact}</span>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">{d.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
