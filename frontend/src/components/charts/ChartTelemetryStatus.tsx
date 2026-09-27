'use client';

import React from 'react';
import Link from 'next/link';
import { Database, Info, UploadCloud, Radio, AlertCircle } from 'lucide-react';
import { TelemetryInspectionResult } from '@/lib/utils/chartData';

interface ChartTelemetryStatusProps {
  inspection: TelemetryInspectionResult;
  domainName?: string;
  showIngestionLink?: boolean;
  className?: string;
}

export const ChartTelemetryStatus: React.FC<ChartTelemetryStatusProps> = ({
  inspection,
  domainName = 'telemetry',
  showIngestionLink = true,
  className = '',
}) => {
  // If count >= 2, we don't display the warning banner (can display minimal status chip if needed)
  if (!inspection.isInsufficientForTrend) {
    return null;
  }

  const { count, isSingleObservation, formattedEarliest } = inspection;

  if (count === 0) {
    return (
      <div
        className={`p-3.5 rounded-lg bg-[#0A121E]/90 border border-slate-700/60 font-mono text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-start gap-2.5">
          <Database className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold text-slate-200">
              No historical {domainName} telemetry recorded for this station node.
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Awaiting SCADA telemetry packet ingestion or CSV upload via Data Ingestion Hub.
            </p>
          </div>
        </div>

        {showIngestionLink && (
          <Link
            href="/data-upload"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all"
          >
            <UploadCloud size={12} />
            <span>Ingest Telemetry</span>
          </Link>
        )}
      </div>
    );
  }

  // Count === 1 or count < minRequired
  return (
    <div
      className={`p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 font-mono text-xs text-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-amber-300">
              {isSingleObservation
                ? '1 observation available — insufficient historical telemetry for a trend visualization.'
                : `${count} observations available — insufficient historical telemetry for a continuous trend.`}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              SINGLE OBSERVATION
            </span>
          </div>
          <p className="text-[11px] text-amber-200/70 mt-0.5">
            The chart renders the discrete recorded telemetry point ({formattedEarliest || 'latest reading'}). Additional sequential SCADA time-series readings are required to generate a continuous curve.
          </p>
        </div>
      </div>

      {showIngestionLink && (
        <Link
          href="/data-upload"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold uppercase tracking-wider shrink-0 transition-all"
        >
          <UploadCloud size={12} />
          <span>Upload Dataset</span>
        </Link>
      )}
    </div>
  );
};
