'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import {
  UploadCloud,
  FileSpreadsheet,
  Sliders,
  Database,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  FileText,
  ArrowRight,
  Sun,
  Wind,
  Zap,
  BatteryCharging,
  Fuel,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function DataUploadPage() {
  const router = useRouter();
  const { activeStationId, setActiveStationId, addToast } = useStation();

  const [activeTab, setActiveTab] = useState<'manual' | 'batch' | 'manage'>('manual');
  const [dbStatus, setDbStatus] = useState<{
    counts: { weather: number; energy: number; renewable: number; alerts: number; totalTelemetryRecords: number };
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // --- 1. Manual Form State ---
  const [manualLoading, setManualLoading] = useState(false);
  const [temperature, setTemperature] = useState<number>(-16.5);
  const [pressure, setPressure] = useState<number>(982.0);
  const [humidity, setHumidity] = useState<number>(68.0);
  const [windSpeed, setWindSpeed] = useState<number>(14.5);
  const [windDirection, setWindDirection] = useState<string>('SSW');
  const [solarRadiation, setSolarRadiation] = useState<number>(180.0);

  const [totalLoad, setTotalLoad] = useState<number>(64.0);
  const [heatingLoad, setHeatingLoad] = useState<number>(28.5);
  const [waterLoad, setWaterLoad] = useState<number>(12.0);
  const [labLoad, setLabLoad] = useState<number>(14.0);
  const [commsLoad, setCommsLoad] = useState<number>(6.5);

  const [solarPower, setSolarPower] = useState<number>(28.0);
  const [windPower, setWindPower] = useState<number>(22.0);

  const [batterySOC, setBatterySOC] = useState<number>(75.0);
  const [batteryFlow, setBatteryFlow] = useState<number>(0.0);
  const [genPower, setGenPower] = useState<number>(14.0);
  const [fuelLevel, setFuelLevel] = useState<number>(82.0);

  // --- 2. Batch Upload State ---
  const [datasetType, setDatasetType] = useState<'weather' | 'energy' | 'renewable'>('weather');
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current database counts
  const loadDatabaseStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await apiClient.getIngestStatus(activeStationId);
      setDbStatus(status);
    } catch (err) {
      console.warn('Could not fetch ingestion status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadDatabaseStatus();
  }, [activeStationId]);

  // Preset scenarios for fast manual injection
  const applyPreset = (preset: 'summer' | 'blizzard' | 'night') => {
    if (preset === 'summer') {
      setTemperature(-6.0);
      setWindSpeed(8.5);
      setSolarRadiation(420.0);
      setSolarPower(38.0);
      setWindPower(15.0);
      setTotalLoad(52.0);
      setHeatingLoad(20.0);
      setBatterySOC(88.0);
      setGenPower(0.0);
    } else if (preset === 'blizzard') {
      setTemperature(-26.0);
      setWindSpeed(28.0);
      setSolarRadiation(0.0);
      setSolarPower(0.0);
      setWindPower(55.0);
      setTotalLoad(84.0);
      setHeatingLoad(45.0);
      setBatterySOC(52.0);
      setGenPower(35.0);
    } else if (preset === 'night') {
      setTemperature(-19.0);
      setWindSpeed(12.0);
      setSolarRadiation(0.0);
      setSolarPower(0.0);
      setWindPower(24.0);
      setTotalLoad(60.0);
      setHeatingLoad(30.0);
      setBatterySOC(65.0);
      setGenPower(20.0);
    }
    addToast({
      type: 'INFO',
      title: 'Scenario Preset Loaded',
      message: `Loaded operational profile for ${preset.toUpperCase()}. Adjust numbers as needed.`,
    });
  };

  // Submit manual telemetry
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualLoading(true);

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        weather: {
          temperature,
          pressure,
          humidity,
          windSpeed,
          windDirection,
          solarRadiation,
        },
        load: {
          totalLoad,
          heatingLoad,
          waterLoad,
          communicationLoad: commsLoad,
          laboratoryLoad: labLoad,
          refrigerationLoad: 4.5,
          flexibleLoad: 2.0,
        },
        renewable: {
          solarPower,
          windPower,
          totalRenewable: solarPower + windPower,
        },
        battery: {
          soc: batterySOC,
          chargePower: batteryFlow > 0 ? batteryFlow : 0,
          dischargePower: batteryFlow < 0 ? Math.abs(batteryFlow) : 0,
        },
        generator: {
          powerOutput: genPower,
          fuelConsumed: Math.round(genPower * 0.25 * 10) / 10,
          fuelLevel,
          efficiency: genPower > 0 ? 38.5 : 0,
        },
      };

      await apiClient.ingestTelemetry(activeStationId, payload);
      await loadDatabaseStatus();

      addToast({
        type: 'SUCCESS',
        title: 'SCADA Telemetry Committed',
        message: `Real-time readings for ${activeStationId.toUpperCase()} saved directly to PostgreSQL.`,
      });

      // Quick prompt to navigate to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: 'Ingestion Failed',
        message: err?.message || 'Could not commit telemetry record to database.',
      });
    } finally {
      setManualLoading(false);
    }
  };

  // Parse CSV / JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    parseFile(selected);
  };

  const parseFile = (fileToParse: File) => {
    setIsParsing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (fileToParse.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const records = Array.isArray(parsed) ? parsed : [parsed];
          setParsedRows(records);
          if (records.length > 0) {
            setPreviewColumns(Object.keys(records[0]));
          }
        } else {
          // Parse CSV
          const lines = text.trim().split(/\r\n|\n/);
          if (lines.length < 2) {
            throw new Error('CSV must contain header row and at least 1 data row.');
          }
          const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
          setPreviewColumns(headers);

          const rows: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
            const rowObj: any = {};
            headers.forEach((h, idx) => {
              const rawVal = values[idx] !== undefined ? values[idx] : '';
              rowObj[h] = isNaN(Number(rawVal)) || rawVal === '' ? rawVal : Number(rawVal);
            });
            rows.push(rowObj);
          }
          setParsedRows(rows);
        }

        addToast({
          type: 'SUCCESS',
          title: 'File Parsed Successfully',
          message: `Extracted ${fileToParse.name.endsWith('.json') ? 'JSON' : 'CSV'} records. Review table preview before committing.`,
        });
      } catch (err: any) {
        addToast({
          type: 'ERROR',
          title: 'File Parsing Error',
          message: err?.message || 'Could not parse dataset file.',
        });
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsText(fileToParse);
  };

  // Upload parsed batch to PostgreSQL
  const handleBatchUpload = async () => {
    if (parsedRows.length === 0) {
      addToast({
        type: 'WARNING',
        title: 'No Rows to Upload',
        message: 'Please choose and parse a CSV or JSON file before uploading.',
      });
      return;
    }

    setIsUploadingBatch(true);
    try {
      const result = await apiClient.ingestBatch(activeStationId, datasetType, parsedRows);
      await loadDatabaseStatus();

      addToast({
        type: 'SUCCESS',
        title: 'Batch Ingestion Complete',
        message: `Committed ${result.insertedCount} ${datasetType.toUpperCase()} records into PostgreSQL for ${activeStationId.toUpperCase()}.`,
      });

      // Reset file and preview
      setFile(null);
      setParsedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      router.push('/dashboard');
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: 'Batch Ingestion Failed',
        message: err?.message || 'Failed to upload batch dataset.',
      });
    } finally {
      setIsUploadingBatch(false);
    }
  };

  // Download Sample CSV
  const downloadTemplate = (type: 'weather' | 'energy' | 'renewable') => {
    let csvContent = '';
    const now = new Date().toISOString();

    if (type === 'weather') {
      csvContent = 'timestamp,temperature,pressure,humidity,windSpeed,windDirection,solarRadiation\n' +
        `${now},-16.5,984.2,65.0,14.2,SSW,180.0\n` +
        `${new Date(Date.now() + 3600000).toISOString()},-15.8,983.8,63.0,16.5,SSW,210.0\n` +
        `${new Date(Date.now() + 7200000).toISOString()},-14.2,982.5,60.0,18.0,S,250.0\n`;
    } else if (type === 'energy') {
      csvContent = 'timestamp,totalLoad,heatingLoad,waterLoad,communicationLoad,laboratoryLoad,refrigerationLoad,flexibleLoad\n' +
        `${now},64.5,28.0,12.0,6.5,12.5,3.5,2.0\n` +
        `${new Date(Date.now() + 3600000).toISOString()},68.2,30.0,13.0,6.5,13.0,3.7,2.0\n` +
        `${new Date(Date.now() + 7200000).toISOString()},72.0,32.5,14.0,6.5,13.0,4.0,2.0\n`;
    } else {
      csvContent = 'timestamp,solarPower,windPower,totalRenewable\n' +
        `${now},25.0,22.0,47.0\n` +
        `${new Date(Date.now() + 3600000).toISOString()},30.0,26.0,56.0\n` +
        `${new Date(Date.now() + 7200000).toISOString()},35.0,28.0,63.0\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `polar_ems_${type}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Purge database telemetry
  const handlePurgeTelemetry = async () => {
    if (!window.confirm(`Are you sure you want to clear all telemetry records for ${activeStationId.toUpperCase()}? (Structural stations and users will remain intact)`)) {
      return;
    }

    try {
      await apiClient.purgeTelemetry(activeStationId);
      await loadDatabaseStatus();
      addToast({
        type: 'SUCCESS',
        title: 'Telemetry Cleared',
        message: `Database purged for ${activeStationId.toUpperCase()}. Clean zero state restored.`,
      });
    } catch (err: any) {
      addToast({
        type: 'ERROR',
        title: 'Purge Failed',
        message: err?.message || 'Could not purge telemetry.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl font-mono">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#1B2C42]/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              SCADA Ingestion Hub
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              PostgreSQL Connected
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <UploadCloud className="w-6 h-6 text-cyan-400" />
            Polar Microgrid Data Ingestion & SCADA Gateway
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manually inject real telemetry readings or batch-upload CSV/JSON datasets to update frontend dashboards and the Neon database.
          </p>
        </div>

        {/* Station Selector & DB Status Badge */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex flex-col items-end">
            <label className="text-[10px] text-slate-400 uppercase font-bold">Target Station</label>
            <select
              value={activeStationId}
              onChange={(e) => setActiveStationId(e.target.value as any)}
              className="bg-[#0A121E] border border-cyan-500/40 text-cyan-300 rounded px-2.5 py-1 text-xs font-bold focus:outline-none focus:border-cyan-400"
            >
              <option value="maitri">Maitri Station (70°S)</option>
              <option value="bharati">Bharati Station (69°S)</option>
            </select>
          </div>

          <button
            onClick={loadDatabaseStatus}
            disabled={loadingStatus}
            title="Refresh Database Status"
            className="p-2 rounded bg-[#0E1724] border border-[#1B2C42] text-slate-400 hover:text-cyan-400 cursor-pointer"
          >
            <RefreshCw size={14} className={loadingStatus ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Database Telemetry Live Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0A121E] border border-[#1B2C42] rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Weather Records</p>
            <p className="text-lg font-bold text-cyan-400">{dbStatus?.counts?.weather ?? 0}</p>
          </div>
          <Sun className="w-5 h-5 text-cyan-500/50" />
        </div>

        <div className="bg-[#0A121E] border border-[#1B2C42] rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Energy Load Records</p>
            <p className="text-lg font-bold text-amber-400">{dbStatus?.counts?.energy ?? 0}</p>
          </div>
          <Zap className="w-5 h-5 text-amber-500/50" />
        </div>

        <div className="bg-[#0A121E] border border-[#1B2C42] rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Renewable Records</p>
            <p className="text-lg font-bold text-emerald-400">{dbStatus?.counts?.renewable ?? 0}</p>
          </div>
          <Wind className="w-5 h-5 text-emerald-500/50" />
        </div>

        <div className="bg-[#0A121E] border border-[#1B2C42] rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Total Database Records</p>
            <p className="text-lg font-bold text-white">{dbStatus?.counts?.totalTelemetryRecords ?? 0}</p>
          </div>
          <Database className="w-5 h-5 text-blue-500/50" />
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-[#1B2C42] gap-2">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase transition-all cursor-pointer border-b-2 ${
            activeTab === 'manual'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Manual Real-Time Injection</span>
        </button>

        <button
          onClick={() => setActiveTab('batch')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase transition-all cursor-pointer border-b-2 ${
            activeTab === 'batch'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>CSV / JSON Batch File Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('manage')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase transition-all cursor-pointer border-b-2 ${
            activeTab === 'manage'
              ? 'border-rose-400 text-rose-300 bg-rose-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Database Purge & Reset</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MANUAL REAL-TIME TELEMETRY INJECTION */}
      {/* ======================================================== */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-6">
          {/* Quick Scenario Fill Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#0E1724] border border-[#1B2C42]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">Load Polar Scenario Presets:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('summer')}
                className="px-2.5 py-1 rounded text-[11px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 cursor-pointer"
              >
                Austral Summer (High Solar)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('blizzard')}
                className="px-2.5 py-1 rounded text-[11px] bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 cursor-pointer"
              >
                Katabatic Blizzard (High Wind & Heating)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('night')}
                className="px-2.5 py-1 rounded text-[11px] bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 cursor-pointer"
              >
                Polar Night (Diesel + BESS Discharge)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Meteorology Subsystem */}
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-4 space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#1B2C42]/60">
                <Sun className="w-4 h-4 text-cyan-400" />
                1. Meteorology Telemetry Packet
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Ambient Temperature (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Atmospheric Pressure (hPa)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={pressure}
                    onChange={(e) => setPressure(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Wind Speed (m/s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Wind Direction</label>
                  <select
                    value={windDirection}
                    onChange={(e) => setWindDirection(e.target.value)}
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="S">S (South)</option>
                    <option value="SSW">SSW (South-Southwest)</option>
                    <option value="SW">SW (Southwest)</option>
                    <option value="SSE">SSE (South-Southeast)</option>
                    <option value="SE">SE (Southeast)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Solar Irradiance (W/m²)</label>
                  <input
                    type="number"
                    step="1"
                    value={solarRadiation}
                    onChange={(e) => setSolarRadiation(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-amber-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Relative Humidity (%)</label>
                  <input
                    type="number"
                    step="1"
                    value={humidity}
                    onChange={(e) => setHumidity(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Electrical Demand Load Subsystem */}
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-4 space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#1B2C42]/60">
                <Zap className="w-4 h-4 text-amber-400" />
                2. Station Electrical Demand Load
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">Total Demand Load (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={totalLoad}
                    onChange={(e) => setTotalLoad(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-amber-500/40 rounded px-3 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Habitation Heating Loop (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={heatingLoad}
                    onChange={(e) => setHeatingLoad(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Water Snow-Melter (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={waterLoad}
                    onChange={(e) => setWaterLoad(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Scientific Laboratory (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={labLoad}
                    onChange={(e) => setLabLoad(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-slate-300 block mb-1">Satellite Communications Array (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={commsLoad}
                    onChange={(e) => setCommsLoad(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Renewable Generation */}
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-4 space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#1B2C42]/60">
                <Wind className="w-4 h-4 text-emerald-400" />
                3. Renewable Generation Assets
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Solar PV Power (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={solarPower}
                    onChange={(e) => setSolarPower(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Wind Turbine Output (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={windPower}
                    onChange={(e) => setWindPower(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="col-span-2 p-2.5 rounded bg-[#0A121E] border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-slate-400">Total Renewable Generation:</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {Math.round((solarPower + windPower) * 10) / 10} kW
                  </span>
                </div>
              </div>
            </div>

            {/* Storage & Diesel Genset Subsystems */}
            <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-4 space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#1B2C42]/60">
                <BatteryCharging className="w-4 h-4 text-cyan-400" />
                4. BESS Storage & Diesel Generator
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">BESS Current SOC (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    step="0.5"
                    value={batterySOC}
                    onChange={(e) => setBatterySOC(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Primary Genset Power (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={genPower}
                    onChange={(e) => setGenPower(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-amber-300 font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Diesel Fuel Remaining (L)</label>
                  <input
                    type="number"
                    step="1"
                    value={fuelLevel}
                    onChange={(e) => setFuelLevel(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Battery Power Flow (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={batteryFlow}
                    onChange={(e) => setBatteryFlow(parseFloat(e.target.value) || 0)}
                    placeholder="+Charge / -Discharge"
                    className="w-full bg-[#0A121E] border border-[#1B2C42] rounded px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1B2C42]/50">
            <button
              type="submit"
              disabled={manualLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              {manualLoading ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
              <span>{manualLoading ? 'TRANSMITTING TO POSTGRESQL...' : 'TRANSMIT LIVE TELEMETRY TO DATABASE'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BATCH CSV / JSON FILE UPLOAD */}
      {/* ======================================================== */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#0E1724] border border-[#1B2C42]">
            <div>
              <label className="text-xs text-slate-300 block mb-1 font-bold uppercase">1. Select Dataset Type</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDatasetType('weather')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase cursor-pointer border ${
                    datasetType === 'weather'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#0A121E] border-[#1B2C42] text-slate-400'
                  }`}
                >
                  Weather & Meteorology
                </button>
                <button
                  type="button"
                  onClick={() => setDatasetType('energy')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase cursor-pointer border ${
                    datasetType === 'energy'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-[#0A121E] border-[#1B2C42] text-slate-400'
                  }`}
                >
                  Electrical Demand Load
                </button>
                <button
                  type="button"
                  onClick={() => setDatasetType('renewable')}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase cursor-pointer border ${
                    datasetType === 'renewable'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-[#0A121E] border-[#1B2C42] text-slate-400'
                  }`}
                >
                  Renewable Generation (Solar/Wind)
                </button>
              </div>
            </div>

            {/* Template Download CTA */}
            <button
              type="button"
              onClick={() => downloadTemplate(datasetType)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0A121E] hover:bg-[#121E2E] border border-[#1B2C42] text-xs text-cyan-300 cursor-pointer self-start sm:self-auto"
            >
              <Download size={13} />
              <span>Download {datasetType.toUpperCase()} CSV Template</span>
            </button>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1B2C42] hover:border-cyan-500/60 rounded-xl p-8 text-center bg-[#0A121E]/60 hover:bg-[#0E1A2B]/40 transition-all cursor-pointer space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center border border-cyan-500/30">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {file ? file.name : 'Click to select or drag & drop CSV or JSON file'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports standard comma-separated (.csv) and JSON time-series arrays.
              </p>
            </div>
            {isParsing && (
              <div className="flex items-center justify-center gap-2 text-xs text-cyan-300">
                <RefreshCw size={12} className="animate-spin" />
                <span>Parsing dataset rows...</span>
              </div>
            )}
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 bg-[#0E1724] border border-[#1B2C42] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white">
                    Parsed {parsedRows.length} Rows Ready for Database Ingestion
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase">
                  Showing first 5 rows
                </span>
              </div>

              <div className="overflow-x-auto border border-[#1B2C42]/60 rounded">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-[#080D14] text-slate-300 border-b border-[#1B2C42]">
                    <tr>
                      {previewColumns.map((col) => (
                        <th key={col} className="px-3 py-2 font-mono uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B2C42]/40 text-slate-200">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#121E2E]">
                        {previewColumns.map((col) => (
                          <td key={col} className="px-3 py-1.5 font-mono truncate max-w-[150px]">
                            {String(row[col] !== undefined ? row[col] : '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Commit Batch Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBatchUpload}
                  disabled={isUploadingBatch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
                >
                  {isUploadingBatch ? <RefreshCw size={14} className="animate-spin" /> : <Database size={14} />}
                  <span>{isUploadingBatch ? 'INGESTING INTO POSTGRESQL...' : `COMMIT ${parsedRows.length} ROWS TO DATABASE`}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: DATABASE TELEMETRY PURGE & RESET */}
      {/* ======================================================== */}
      {activeTab === 'manage' && (
        <div className="bg-[#0E1724] border border-rose-500/30 rounded-lg p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                Purge Station Telemetry & Reset to Clean Zero State
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Wipes all time-series readings (weather data, electrical loads, renewable generation, generator logs, battery records) for{' '}
                <span className="text-cyan-300 font-bold">{activeStationId.toUpperCase()}</span>.
              </p>
              <p className="text-xs text-emerald-400/90 mt-1">
                ✓ Structural models (station definitions, registered user accounts, generator topology) will remain completely safe.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1B2C42] flex justify-end">
            <button
              type="button"
              onClick={handlePurgeTelemetry}
              className="flex items-center gap-2 px-4 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_12px_rgba(244,63,94,0.3)]"
            >
              <Trash2 size={14} />
              <span>PURGE ALL TELEMETRY FOR {activeStationId.toUpperCase()}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
