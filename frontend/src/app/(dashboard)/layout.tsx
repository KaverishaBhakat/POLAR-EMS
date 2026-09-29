'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen h-[100dvh] overflow-hidden bg-[#020203] text-[#EDEDEF] font-sans antialiased selection:bg-[#5E6AD2]/30 selection:text-[#EDEDEF]">
      {/* Ambient Radial Indigo Light */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-[#5E6AD2]/10 via-[#5E6AD2]/[0.03] to-transparent blur-3xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Persistent Linear Console Sidebar (Independent Fixed & Scroll Container) */}
      <Sidebar />

      {/* Main Content Area (Independent Scroll Container) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-screen h-[100dvh] overflow-y-auto overscroll-contain relative z-10 scrollbar-thin">
        <Header />
        <main className="flex-1 p-5 sm:p-7 lg:p-9 space-y-7 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
