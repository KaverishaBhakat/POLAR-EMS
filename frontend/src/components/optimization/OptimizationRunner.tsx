'use client';

import React, { useState } from 'react';
import { useStation } from '@/lib/context/StationContext';
import { apiClient } from '@/lib/api/client';
import { Sliders, Play, RefreshCw, CheckCircle2, Shield, Cpu, Zap } from 'lucide-react';
import { OptimizationMetrics } from '@/lib/types';

interface OptimizationRunnerProps {
  metrics: OptimizationMetrics;
  onMetricsUpdate: (newMetrics: OptimizationMetrics) => void;
}

export const OptimizationRunner: React.FC<OptimizationRunnerProps> = ({
  metrics,
  onMetricsUpdate,
}) => {
  const { activeStationId, addToast } = useStation();
  const [isComputing, setIsComputing] = useState(false);
  const [computeStage, setComputeStage] = useState<string>('');

  const handleRunOptimization = async () => {
    setIsComputing(true);
    setComputeStage('1. Ingesting live telemetry & weather vectors...');

    setTimeout(() => {
      setComputeStage('2. Formulating MILP objective function (Min Fuel, Max Battery Life)...');
    }, 300);

    setTimeout(() => {
      setComputeStage('3. Enforcing 100% critical life-support & thermal constraints...');
    }, 600);

    try {
      const res = await apiClient.runOptimization(activeStationId);
      onMetricsUpdate(res.metrics);
      addToast({
        type: 'SUCCESS',
        title: 'Optimization Solver Converged',
        message: `New optimal dispatch schedule generated in ${res.metrics.solverExecutionTimeMs}ms. Estimated fuel savings: ${res.metrics.fuelSavedL} L/day.`,
      });
    } catch (e) {
      addToast({
        type: 'ERROR',
        title: 'Solver Execution Failed',
        message: 'Unable to communicate with optimization engine.',
      });
    } finally {
      setIsComputing(false);
      setComputeStage('');
    }
  };

  return (
    <div className="bg-[#0E1724]/90 backdrop-blur-md rounded-lg border border-[#1B2C42] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Active Dispatch Engine Control
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Solver: CBC / HiGHS Branch-and-Cut MILP Optimizer | Convergence Tolerance: 1e-4
          </p>
        </div>

        <button
          onClick={handleRunOptimization}
          disabled={isComputing}
          className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg font-mono font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-xl ${
            isComputing
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 cursor-wait'
              : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-[#080D14] shadow-[0_0_15px_rgba(6,182,212,0.35)] cursor-pointer'
          }`}
        >
          {isComputing ? (
            <>
              <RefreshCw size={15} className="animate-spin text-cyan-300" />
              <span>SOLVING DISPATCH ({metrics.solverExecutionTimeMs}ms)...</span>
            </>
          ) : (
            <>
              <Play size={15} className="fill-current" />
              <span>RUN OPTIMIZATION</span>
            </>
          )}
        </button>
      </div>

      {/* Real-time solver stage indicator */}
      {isComputing && (
        <div className="mt-3 p-2.5 rounded bg-[#08101C] border border-cyan-500/30 text-xs font-mono text-cyan-300 animate-pulse flex items-center gap-2">
          <Cpu size={14} className="text-cyan-400 animate-spin-slow" />
          <span>{computeStage}</span>
        </div>
      )}
    </div>
  );
};
