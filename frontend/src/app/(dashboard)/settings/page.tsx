'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStation, getInitials, UserProfile } from '@/lib/context/StationContext';
import { Settings as SettingsIcon, Save, RefreshCw, Shield, Bell, Cpu, Globe, Sliders, User, Lock, Mail, BadgeCheck } from 'lucide-react';
import { PageHeader, GlassCard, Button } from '@/components/ui';

export default function SettingsPage() {
  const router = useRouter();
  const { activeStationId, setActiveStationId, addToast, currentUser, setCurrentUser } = useStation();

  // User Profile & Security state
  const [userName, setUserName] = useState(currentUser?.name || 'Kaverisha Bhakat');
  const [userEmail, setUserEmail] = useState(currentUser?.email || 'kaveri@gmail.com');
  const [userRole, setUserRole] = useState(currentUser?.role || 'Microgrid SCADA Operator (Bharati)');
  const [userStation, setUserStation] = useState<'maitri' | 'bharati' | 'ncpor_hq'>(
    (currentUser?.station as any) || activeStationId || 'bharati'
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Keep state synchronized with context
  useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.name);
      setUserEmail(currentUser.email);
      setUserRole(currentUser.role);
      if (currentUser.station) {
        setUserStation(currentUser.station as any);
      }
    }
  }, [currentUser]);

  const [criticalReserveBuffer, setCriticalReserveBuffer] = useState(25);
  const [batteryMinSoc, setBatteryMinSoc] = useState(30);
  const [batteryMaxSoc, setBatteryMaxSoc] = useState(95);
  const [generatorSfcOptimal, setGeneratorSfcOptimal] = useState(80);

  const [forecastHorizon, setForecastHorizon] = useState('24h');
  const [modelType, setModelType] = useState('Transformer-LSTM Polar Ensemble v4.2');
  const [confidenceThreshold, setConfidenceThreshold] = useState(90);

  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyFuel, setNotifyFuel] = useState(true);
  const [notifyWeather, setNotifyWeather] = useState(true);
  const [notifyBattery, setNotifyBattery] = useState(true);

  const [backendUrl, setBackendUrl] = useState('http://localhost:8000/api/v1');
  const [refreshInterval, setRefreshInterval] = useState('5s');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      addToast({
        type: 'ERROR',
        title: 'Passcodes Do Not Match',
        message: 'Security passcode and confirmation passcode do not match.',
      });
      return;
    }

    setIsSaving(true);

    const updatedUser: UserProfile = {
      name: userName.trim() || currentUser?.name || 'Station Operator',
      email: userEmail.trim() || currentUser?.email || 'operator@polar-ems.ncpor.res.in',
      role: userRole.trim() || currentUser?.role || 'Station SCADA Operator',
      station: userStation,
      initials: getInitials(userName.trim() || currentUser?.name || 'SO'),
    };

    setCurrentUser(updatedUser);
    if (userStation === 'maitri' || userStation === 'bharati') {
      setActiveStationId(userStation);
    }

    setTimeout(() => {
      setIsSaving(false);
      addToast({
        type: 'SUCCESS',
        title: 'Credentials & Settings Saved',
        message: `Updated profile for ${updatedUser.name}. Redirecting to live operations dashboard...`,
      });
      router.push('/dashboard');
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <PageHeader
        title="Station SCADA & System Configuration"
        subtitle="Microgrid reserve buffers, AI optimizer thresholds, and operator credentials"
        icon={<SettingsIcon className="w-5 h-5 text-accent-bright" />}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "System Config" }
        ]}
        actions={
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="primary"
            size="sm"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            <span>{isSaving ? 'COMMITTING...' : 'SAVE & GO TO DASHBOARD'}</span>
          </Button>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* 0. Station Operator Profile & Security Credentials */}
        <GlassCard className="p-5 space-y-4 border-accent/30">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/6">
            <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <User className="w-4 h-4 text-accent-bright" />
              Station Operator Profile & Security Credentials
            </h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-accent/10 text-accent-bright border border-accent/20">
              Clearance: Level 4 SCADA
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-300 block mb-1 font-medium uppercase">
                Operator Full Name / Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                  placeholder="e.g. Kaverisha Bhakat"
                  className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 pl-9 text-white focus:outline-none focus:border-accent"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium uppercase">
                Station Call-Sign / Operator Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                  placeholder="name@ncpor.res.in"
                  className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 pl-9 text-white focus:outline-none focus:border-accent"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium uppercase">
                Operational Duty & Designation
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  placeholder="e.g. Microgrid SCADA Operator (Bharati)"
                  className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 pl-9 text-white focus:outline-none focus:border-accent"
                />
                <BadgeCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium uppercase">
                Assigned Station
              </label>
              <select
                value={userStation}
                onChange={(e) => setUserStation(e.target.value as any)}
                className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              >
                <option value="maitri" className="bg-[#0a0a0c] text-slate-200">Maitri Research Station (70°S)</option>
                <option value="bharati" className="bg-[#0a0a0c] text-slate-200">Bharati Research Station (69°S)</option>
                <option value="ncpor_hq" className="bg-[#0a0a0c] text-slate-200">NCPOR Operations HQ (Goa)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium uppercase">
                Update Security Passcode / Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new security passcode"
                  className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 pl-9 text-white focus:outline-none focus:border-accent"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="text-slate-300 block mb-1 font-medium uppercase">
                Confirm New Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter security passcode"
                  className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 pl-9 text-white focus:outline-none focus:border-accent"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 1. Station Microgrid & Safety Configuration */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide flex items-center gap-2 pb-2.5 border-b border-white/6">
            <Shield className="w-4 h-4 text-emerald-400" />
            Station Operational & Reserve Constraints
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-300 block mb-1">Primary Monitored Station</label>
              <select
                value={activeStationId}
                onChange={(e) => setActiveStationId(e.target.value as any)}
                className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              >
                <option value="maitri" className="bg-[#0a0a0c] text-slate-200">Maitri Research Station (70°S)</option>
                <option value="bharati" className="bg-[#0a0a0c] text-slate-200">Bharati Research Station (69°S)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">
                Critical Life-Support Reserve Buffer: <span className="text-emerald-400 font-bold">+{criticalReserveBuffer}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={criticalReserveBuffer}
                onChange={(e) => setCriticalReserveBuffer(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#080D14] rounded accent-emerald-400 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">
                Battery Minimum SOC Lock: <span className="text-accent-bright font-bold">{batteryMinSoc}%</span>
              </label>
              <input
                type="range"
                min="20"
                max="50"
                value={batteryMinSoc}
                onChange={(e) => setBatteryMinSoc(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#080D14] rounded accent-accent cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">
                Battery Maximum Charge Limit: <span className="text-accent-bright font-bold">{batteryMaxSoc}%</span>
              </label>
              <input
                type="range"
                min="80"
                max="100"
                value={batteryMaxSoc}
                onChange={(e) => setBatteryMaxSoc(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#080D14] rounded accent-accent cursor-pointer"
              />
            </div>
          </div>
        </GlassCard>

        {/* 2. AI Forecast & Optimizer Model Configuration */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide flex items-center gap-2 pb-2.5 border-b border-white/6">
            <Cpu className="w-4 h-4 text-accent-bright" />
            AI Forecast Model & Solver Parameters
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-300 block mb-1">Lookahead Forecast Horizon</label>
              <select
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              >
                <option value="12h" className="bg-[#0a0a0c] text-slate-200">12 Hours (High Precision)</option>
                <option value="24h" className="bg-[#0a0a0c] text-slate-200">24 Hours (Standard Operational)</option>
                <option value="48h" className="bg-[#0a0a0c] text-slate-200">48 Hours (Polar Expedition Planning)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Deep Learning Model Backbone</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent"
              >
                <option value="Transformer-LSTM Polar Ensemble v4.2" className="bg-[#0a0a0c] text-slate-200">Transformer-LSTM Polar Ensemble v4.2</option>
                <option value="XGBoost-Physics Hybrid v3.1" className="bg-[#0a0a0c] text-slate-200">XGBoost-Physics Hybrid v3.1</option>
                <option value="Physics-Informed Neural Network (PINN)" className="bg-[#0a0a0c] text-slate-200">Physics-Informed Neural Network (PINN)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">
                Confidence Threshold Gate: <span className="text-accent-bright font-bold">{confidenceThreshold}%</span>
              </label>
              <input
                type="range"
                min="80"
                max="98"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#080D14] rounded accent-accent cursor-pointer"
              />
            </div>
          </div>
        </GlassCard>

        {/* 3. Notification & Alert Subscriptions */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide flex items-center gap-2 pb-2.5 border-b border-white/6">
            <Bell className="w-4 h-4 text-amber-400" />
            SCADA Alert & Telemetry Subscriptions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/6 hover:border-rose-500/30 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyCritical}
                onChange={(e) => setNotifyCritical(e.target.checked)}
                className="accent-rose-500 w-4 h-4 rounded"
              />
              <span className="text-slate-200">Critical Life-Support Alarms</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/6 hover:border-amber-500/30 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyFuel}
                onChange={(e) => setNotifyFuel(e.target.checked)}
                className="accent-amber-500 w-4 h-4 rounded"
              />
              <span className="text-slate-200">Fuel SFC & Reserve Alerts</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/6 hover:border-cyan-500/30 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyWeather}
                onChange={(e) => setNotifyWeather(e.target.checked)}
                className="accent-cyan-500 w-4 h-4 rounded"
              />
              <span className="text-slate-200">Katabatic Storm Warnings</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/6 hover:border-emerald-500/30 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyBattery}
                onChange={(e) => setNotifyBattery(e.target.checked)}
                className="accent-emerald-500 w-4 h-4 rounded"
              />
              <span className="text-slate-200">BESS SOC Threshold Alerts</span>
            </label>
          </div>
        </GlassCard>

        {/* 4. Backend Integration (FastAPI Endpoint) */}
        <GlassCard className="p-5 space-y-4">
          <h3 className="text-xs sm:text-sm font-semibold text-white tracking-wide flex items-center gap-2 pb-2.5 border-b border-white/6">
            <Globe className="w-4 h-4 text-blue-400" />
            Backend API & Telemetry Polling Interface
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-slate-300 block mb-1">FastAPI Backend Endpoint URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-accent font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Connected to local FastAPI microservice / simulated mock data provider.
              </p>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Telemetry Polling Frequency</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/6 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-accent font-mono"
              >
                <option value="1s" className="bg-[#0a0a0c] text-slate-200">1 Second (Real-Time SCADA)</option>
                <option value="5s" className="bg-[#0a0a0c] text-slate-200">5 Seconds (Standard Operations)</option>
                <option value="30s" className="bg-[#0a0a0c] text-slate-200">30 Seconds (Bandwidth Conservative)</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Bottom Save CTA */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/6">
          <Button
            type="submit"
            disabled={isSaving}
            variant="primary"
            size="md"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            <span>{isSaving ? 'COMMITTING & REDIRECTING...' : 'SAVE & GO TO DASHBOARD'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
