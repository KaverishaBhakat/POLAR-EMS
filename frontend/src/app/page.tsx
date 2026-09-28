'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { useVideoScrub } from '@/hooks/useVideoScrub';
import { Navbar } from '@/components/Navbar';
import { Section1 } from '@/components/Section1';
import { Section2 } from '@/components/Section2';
import { Section3 } from '@/components/Section3';
import { ArrowRight, UserPlus, LogIn, ShieldAlert } from 'lucide-react';
import { PolarLogo } from '@/components/common/PolarLogo';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { videoRef, canvasRef, scrollProgress, canvasLive } = useVideoScrub(
    VIDEO_URL,
    containerRef
  );

  const p = scrollProgress;

  // Section 1 Opacity
  const s1Opacity = p < 0.20 ? 1 : Math.max(0, 1 - (p - 0.20) / 0.08);

  // Section 2 Opacity
  const s2Opacity =
    p < 0.32
      ? 0
      : p < 0.40
      ? (p - 0.32) / 0.08
      : p < 0.55
      ? 1
      : Math.max(0, 1 - (p - 0.55) / 0.08);

  // Section 3 Opacity
  const s3Opacity =
    p < 0.67
      ? 0
      : p < 0.75
      ? (p - 0.67) / 0.08
      : 1;

  return (
    <div ref={containerRef} className="relative h-[500vh]">
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        {/* 1) Video full cover */}
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
        />

        {/* 2) Canvas 1920x1080 full cover */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            canvasLive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* 3) Overlay containing Navbar + 3 sequential sections */}
        <div className="absolute inset-0 pointer-events-none">
          <Navbar scrollProgress={p} />
          <Section1 opacity={s1Opacity} />
          <Section2 opacity={s2Opacity} />
          <Section3 opacity={s3Opacity} />
        </div>

        {/* Fixed Quick Launch Bar at bottom-left */}
        <div className="absolute bottom-6 sm:bottom-8 left-4 sm:left-8 md:left-12 z-50 pointer-events-auto flex items-center gap-2 font-mono">
          {/* Control Center Access Button Pill */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#08111D]/90 hover:bg-[#0E1D32] border border-cyan-500/50 hover:border-cyan-400 text-white text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md group"
            title="Enter Live POLAR-EMS SCADA Dashboard"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <PolarLogo size={16} className="text-cyan-400" />
            <span className="font-bold">SCADA Dashboard</span>
            <ArrowRight size={13} className="text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
