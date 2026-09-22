'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { EnergyData, Station, StationId, WeatherData } from '../types';
import { apiClient } from '../api/client';

export type TimeRange = '6H' | '12H' | '24H' | '7D';

export interface ToastMessage {
  id: string;
  type: 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  title: string;
  message: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  station: string;
  initials: string;
}

export const getInitials = (name: string): string => {
  if (!name) return 'SO';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const DEFAULT_USER: UserProfile = {
  name: 'Kaverisha Bhakat',
  email: 'kaveri@gmail.com',
  role: 'Microgrid SCADA Operator (Bharati)',
  station: 'bharati',
  initials: 'KB',
};

interface StationContextType {
  activeStationId: StationId;
  setActiveStationId: (id: StationId) => void;
  station: Station | null;
  weather: WeatherData | null;
  energy: EnergyData | null;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  unreadAlertCount: number;
  refreshAlertCount: () => Promise<void>;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  isLiveTelemetry: boolean;
  setIsLiveTelemetry: (live: boolean) => void;
  lastTelemetryTick: Date;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
}

const StationContext = createContext<StationContextType | undefined>(undefined);

export function StationProvider({ children }: { children: React.ReactNode }) {
  const [activeStationId, setActiveStationId] = useState<StationId>('maitri');
  const [currentUser, setCurrentUserState] = useState<UserProfile>(DEFAULT_USER);
  const [station, setStation] = useState<Station | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [energy, setEnergy] = useState<EnergyData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLiveTelemetry, setIsLiveTelemetry] = useState<boolean>(true);
  const [lastTelemetryTick, setLastTelemetryTick] = useState<Date>(new Date());

  // Synchronize user profile with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('polar_ems_user');
        if (saved) {
          setCurrentUserState(JSON.parse(saved));
        } else {
          localStorage.setItem('polar_ems_user', JSON.stringify(DEFAULT_USER));
        }
      } catch (e) {
        console.error('Error reading polar_ems_user from localStorage:', e);
      }
    }
  }, []);

  const setCurrentUser = (user: UserProfile) => {
    setCurrentUserState(user);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('polar_ems_user', JSON.stringify(user));
      } catch (e) {
        console.error('Error saving polar_ems_user to localStorage:', e);
      }
    }
  };

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshAlertCount = async () => {
    try {
      const activeAlerts = await apiClient.getActiveAlerts(activeStationId);
      setUnreadAlertCount(activeAlerts.length);
    } catch {
      setUnreadAlertCount(0);
    }
  };

  // Load initial station data
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      const st = await apiClient.getStation(activeStationId);
      const wt = await apiClient.getWeatherData(activeStationId);
      const en = await apiClient.getEnergyData(activeStationId);
      if (isMounted) {
        setStation(st);
        setWeather(wt);
        setEnergy(en);
        refreshAlertCount();
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeStationId]);

  // Live telemetry pulse every 5 seconds (micro-jitter in live SCADA data)
  useEffect(() => {
    if (!isLiveTelemetry) return;
    const interval = setInterval(() => {
      setLastTelemetryTick(new Date());
      setEnergy((prev) => {
        if (!prev) return prev;
        const jitter = (Math.random() * 2 - 1) * 2.5;
        const newLoad = Math.round(prev.currentLoadKW + jitter);
        const newSolar = Math.max(0, Math.round(prev.solarGenerationKW + (Math.random() * 1 - 0.5)));
        const newWind = Math.max(0, Math.round(prev.windGenerationKW + (Math.random() * 2 - 1)));
        const newRen = newSolar + newWind;
        return {
          ...prev,
          currentLoadKW: newLoad,
          solarGenerationKW: newSolar,
          windGenerationKW: newWind,
          totalRenewableKW: newRen,
          renewablePenetrationPercent: +((newRen / newLoad) * 100).toFixed(1),
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isLiveTelemetry]);

  return (
    <StationContext.Provider
      value={{
        activeStationId,
        setActiveStationId,
        station,
        weather,
        energy,
        timeRange,
        setTimeRange,
        unreadAlertCount,
        refreshAlertCount,
        toasts,
        addToast,
        removeToast,
        isLiveTelemetry,
        setIsLiveTelemetry,
        lastTelemetryTick,
        currentUser,
        setCurrentUser,
      }}
    >
      {children}
    </StationContext.Provider>
  );
}

export function useStation() {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error('useStation must be used within a StationProvider');
  }
  return context;
}
