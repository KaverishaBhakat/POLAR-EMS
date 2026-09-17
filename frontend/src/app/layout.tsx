import type { Metadata } from 'next';
import './globals.css';
import { StationProvider } from '@/lib/context/StationContext';
import { ToastContainer } from '@/components/common/Toast';

export const metadata: Metadata = {
  title: 'POLAR-EMS | AI Antarctic Research Station Energy Management System',
  description: 'Intelligent SCADA Energy Management & Predictive Microgrid Optimization for Indian Antarctic Research Stations (Maitri & Bharati).',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://db.onlinewebfonts.com/c/95cecf452d3208890088a5b4c19c7ecf?family=Helvetica+Neue+ME"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080D14] text-slate-100 min-h-screen overflow-x-hidden antialiased">
        <StationProvider>
          {children}
          <ToastContainer />
        </StationProvider>
      </body>
    </html>
  );
}
