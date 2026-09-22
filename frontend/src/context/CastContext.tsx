'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RideRecord, fetchDemoCast, fetchUserRides, FALLBACK_CAST } from '../lib/api';

interface CastContextType {
  cast: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  topUpWallet: (amountBdt: number) => void;
  refreshUser: () => Promise<void>;
  userRides: RideRecord[];
  activeRide: RideRecord | null;
  setActiveRide: (ride: RideRecord | null) => void;
}

const CastContext = createContext<CastContextType | undefined>(undefined);

export function CastProvider({ children }: { children: React.ReactNode }) {
  const [cast, setCast] = useState<User[]>(FALLBACK_CAST);
  const [currentUser, setCurrentUser] = useState<User>(FALLBACK_CAST[0]); // Default Nusrat
  const [userRides, setUserRides] = useState<RideRecord[]>([]);
  const [activeRide, setActiveRide] = useState<RideRecord | null>(null);

  useEffect(() => {
    async function loadData() {
      const users = await fetchDemoCast();
      setCast(users);
      const initialUser = users.find((u) => u.name === 'Nusrat') || users[0];
      setCurrentUser(initialUser);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserRides(currentUser.id).then((rides) => {
        setUserRides(rides);
        const active = rides.find(
          (r) =>
            r.status === 'REQUESTED' ||
            r.status === 'MATCHED' ||
            r.status === 'DRIVER_ARRIVED' ||
            r.status === 'STARTED',
        );
        setActiveRide(active || null);
      });
    }
  }, [currentUser]);

  const refreshUser = async () => {
    if (currentUser?.id) {
      const users = await fetchDemoCast();
      setCast(users);
      const updated = users.find((u) => u.id === currentUser.id);
      if (updated) setCurrentUser(updated);

      const rides = await fetchUserRides(currentUser.id);
      setUserRides(rides);
    }
  };

  const topUpWallet = (amountBdt: number) => {
    const poysha = amountBdt * 100;
    setCurrentUser((prev) => ({
      ...prev,
      walletPoysha: prev.walletPoysha + poysha,
      transactions: [
        {
          id: `sim-tx-${Date.now()}`,
          amountPoysha: poysha,
          type: 'TOPUP',
          description: `TeslaPay Simulated Top-up (+৳${amountBdt})`,
          createdAt: new Date().toISOString(),
        },
        ...(prev.transactions || []),
      ],
    }));
  };

  return (
    <CastContext.Provider
      value={{
        cast,
        currentUser,
        setCurrentUser,
        topUpWallet,
        refreshUser,
        userRides,
        activeRide,
        setActiveRide,
      }}
    >
      {children}
    </CastContext.Provider>
  );
}

export function useCast() {
  const context = useContext(CastContext);
  if (!context) {
    throw new Error('useCast must be used within a CastProvider');
  }
  return context;
}
