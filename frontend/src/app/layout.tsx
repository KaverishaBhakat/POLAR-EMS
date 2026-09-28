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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
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
