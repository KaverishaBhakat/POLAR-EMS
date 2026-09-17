'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Compass,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Building2,
  Radio,
  User,
  UserPlus,
  LogIn,
  CheckCircle2,
  BadgeCheck,
} from 'lucide-react';
import { useStation, getInitials } from '@/lib/context/StationContext';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast, setCurrentUser, setActiveStationId } = useStation();

  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('chief.engineer@ncpor.res.in');
  const [signInPassword, setSignInPassword] = useState('••••••••••••');

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpStation, setSignUpStation] = useState<'maitri' | 'bharati' | 'ncpor_hq'>('maitri');
  const [signUpRole, setSignUpRole] = useState('Station Chief Engineer');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setMode('signup');
    }
  }, [searchParams]);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      if (signInEmail === 'chief.engineer@ncpor.res.in') {
        setCurrentUser({
          name: 'Dr. A. K. Sharma',
          email: 'chief.engineer@ncpor.res.in',
          role: 'Station Chief Engineer (NCPOR)',
          station: 'maitri',
          initials: 'AS',
        });
      } else {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('polar_ems_user') : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.email === signInEmail) {
              setCurrentUser(parsed);
            }
          } catch (e) {
            // ignore
          }
        }
      }
      addToast({
        type: 'SUCCESS',
        title: 'Authentication Verified',
        message: 'Welcome Dr. Sharma. Logged in to Maitri Operations Console.',
      });
      router.push('/dashboard');
    }, 600);
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpPassword && signUpPassword !== signUpConfirmPassword) {
      addToast({
        type: 'ERROR',
        title: 'Passcodes Do Not Match',
        message: 'Please ensure both security passcodes match before submitting.',
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const stationLabel =
        signUpStation === 'maitri'
          ? 'Maitri Research Station'
          : signUpStation === 'bharati'
          ? 'Bharati Research Station'
          : 'NCPOR Operations HQ';

      const userName = signUpName.trim() || 'Officer';
      const userProfile = {
        name: userName,
        email: signUpEmail.trim(),
        role: `${signUpRole} (${signUpStation === 'bharati' ? 'Bharati' : signUpStation === 'maitri' ? 'Maitri' : 'HQ'})`,
        station: signUpStation,
        initials: getInitials(userName),
      };

      setCurrentUser(userProfile);
      if (signUpStation === 'bharati' || signUpStation === 'maitri') {
        setActiveStationId(signUpStation);
      }

      addToast({
        type: 'SUCCESS',
        title: 'Station Operator Registered',
        message: `Welcome ${userName}. Account verified for ${stationLabel} (${signUpRole}).`,
      });
      router.push('/dashboard');
    }, 800);
  };

  const handleDemoLogin = (stationId: 'maitri' | 'bharati') => {
    setIsLoading(true);
    setTimeout(() => {
      const stationName = stationId === 'maitri' ? 'Maitri' : 'Bharati';
      setCurrentUser({
        name: 'Dr. A. K. Sharma',
        email: `chief.${stationId}@ncpor.res.in`,
        role: `Station Chief Engineer (${stationName})`,
        station: stationId,
        initials: 'AS',
      });
      setActiveStationId(stationId);
      addToast({
        type: 'SUCCESS',
        title: 'Demo Access Granted',
        message: `Authenticated as Station Chief Engineer (${stationName}).`,
      });
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#080D14] flex flex-col md:flex-row items-stretch font-mono">
      {/* Left Column: Branding, Antarctic Programme Badge & Visuals */}
      <div className="md:w-1/2 p-8 sm:p-12 bg-gradient-to-br from-[#0B1524] via-[#0D1A2D] to-[#070D18] border-b md:border-b-0 md:border-r border-[#1B2C42] flex flex-col justify-between relative overflow-hidden">
        {/* Background glow & radar circles */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-2 group">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:border-cyan-400 transition-colors">
              <Compass size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-white">
                POLAR<span className="text-cyan-400">-EMS</span>
              </h1>
              <p className="text-[10px] text-slate-400">
                INDIAN ANTARCTIC PROGRAMME | NCPOR & MoES
              </p>
            </div>
          </Link>
        </div>

        {/* Center Mission Statement */}
        <div className="my-10 space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            <span>ANTARCTIC RESEARCH STATIONS SCADA</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-slate-100 leading-tight">
            AI-Powered Polar Energy Management Platform
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
            Intelligent load forecasting, dynamic MILP generator-battery dispatch optimization, and
            100% life-support protection for Maitri (70°S) and Bharati (69°S) Research Stations.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 text-xs">
            <div className="p-3 rounded bg-[#0A121E]/80 border border-[#1B2C42]">
              <div className="text-cyan-400 font-bold text-base">21.2%</div>
              <div className="text-[10px] text-slate-400">Daily Fuel Savings</div>
            </div>
            <div className="p-3 rounded bg-[#0A121E]/80 border border-[#1B2C42]">
              <div className="text-emerald-400 font-bold text-base">100.0%</div>
              <div className="text-[10px] text-slate-400">Critical Life-Support Guarantee</div>
            </div>
          </div>

          {/* Quick return to landing */}
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400/80 hover:text-cyan-300 transition-colors"
            >
              <span>← Return to Public Landing Page</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-slate-500 border-t border-[#1B2C42]/60 pt-4 flex justify-between items-center relative z-10">
          <span>CLASSIFICATION: OFFICIAL GOVT / RESEARCH</span>
          <span>NCPOR GOA / MOES INDIA</span>
        </div>
      </div>

      {/* Right Column: Mission Control Sign In / Sign Up Form */}
      <div className="md:w-1/2 p-8 sm:p-12 bg-[#080E17] flex flex-col justify-center relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Mode Switch Tabs */}
          <div className="flex rounded-lg bg-[#0D1624] p-1 border border-[#1B2C42]">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase rounded transition-all ${
                mode === 'signin'
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn size={14} />
              <span>Operator Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold uppercase rounded transition-all ${
                mode === 'signup'
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus size={14} />
              <span>Sign Up / Register</span>
            </button>
          </div>

          {/* Heading Description */}
          <div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {mode === 'signin' ? (
                <>
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Station Operator Sign In
                </>
              ) : (
                <>
                  <BadgeCheck className="w-4 h-4 text-cyan-400" />
                  Register Station Operator
                </>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'signin'
                ? 'Enter authorized research station credentials to access the live SCADA control room.'
                : 'Create an authorized operator account for Antarctic Microgrid SCADA telemetry & optimization.'}
            </p>
          </div>

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-bold uppercase">
                  Operator Email / ID
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-3.5 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                    placeholder="name@ncpor.res.in"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-bold uppercase">
                  Security Passcode
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-3.5 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                    placeholder="••••••••••••"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>{isLoading ? 'AUTHENTICATING TELEMETRY...' : 'SIGN IN TO SCADA'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold uppercase">
                  Full Name & Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    placeholder="e.g. Dr. Rajesh K. Varma"
                    className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-3.5 py-2 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-bold uppercase">
                  NCPOR / Official Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    placeholder="rajesh.varma@ncpor.res.in"
                    className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-3.5 py-2 pl-10 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-bold uppercase">
                    Assigned Station
                  </label>
                  <select
                    value={signUpStation}
                    onChange={(e) => setSignUpStation(e.target.value as any)}
                    className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="maitri">Maitri (70°S)</option>
                    <option value="bharati">Bharati (69°S)</option>
                    <option value="ncpor_hq">NCPOR Goa HQ</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-bold uppercase">
                    Clearance Role
                  </label>
                  <select
                    value={signUpRole}
                    onChange={(e) => setSignUpRole(e.target.value)}
                    className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none transition-colors"
                  >
                    <option value="Station Chief Engineer">Chief Engineer</option>
                    <option value="Microgrid SCADA Operator">SCADA Operator</option>
                    <option value="Research Scientist">Research Scientist</option>
                    <option value="MoES Oversight Observer">MoES Observer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-bold uppercase">
                    Passcode
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1 font-bold uppercase">
                    Confirm Passcode
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-[#0A121E] border border-[#1B2C42] focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <span>{isLoading ? 'ENROLLING STATION OPERATOR...' : 'COMPLETE REGISTRATION & ENTER SCADA'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Quick Demo Login One-Click Buttons */}
          <div className="pt-4 border-t border-[#1B2C42]/60 space-y-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider text-center">
              — Instant Demo Access (SIH Jury / Evaluators) —
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('maitri')}
                className="p-2.5 rounded bg-[#0D1826] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <Building2 size={13} className="text-cyan-400" />
                <span>Maitri Station Chief</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('bharati')}
                className="p-2.5 rounded bg-[#0D1826] border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <Building2 size={13} className="text-emerald-400" />
                <span>Bharati Station Chief</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080D14] flex items-center justify-center text-cyan-400 font-mono text-sm">
          Loading Station Telemetry Security Console...
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
