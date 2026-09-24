'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  RideRecord,
  fetchDemoCast,
  fetchUserRides,
  FALLBACK_CAST,
  loginApi,
  registerApi,
  fetchMeApi,
  getStoredToken,
  clearStoredToken,
} from '../lib/api';

interface CastContextType {
  cast: User[];
  currentUser: User;
  setCurrentUser: (user: User) => void;
  token: string | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  quickLogin: (user: User) => Promise<void>;
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
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRides, setUserRides] = useState<RideRecord[]>([]);
  const [activeRide, setActiveRide] = useState<RideRecord | null>(null);

  useEffect(() => {
    async function loadData() {
      // 1. Fetch available cast
      const users = await fetchDemoCast();
      if (users && users.length > 0) {
        setCast(users);
      }

      // 2. Check stored JWT token
      const stored = getStoredToken();
      if (stored) {
        setToken(stored);
        const me = await fetchMeApi(stored);
        if (me) {
          setCurrentUser(me);
          setIsAuthenticated(true);
          return;
        }
      }

      // Fallback default
      const initialUser = users.find((u) => u.name === 'Nusrat') || users[0] || FALLBACK_CAST[0];
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

  const login = async (identifier: string, password: string): Promise<User> => {
    const res = await loginApi(identifier, password);
    setToken(res.accessToken);
    setCurrentUser(res.user);
    setIsAuthenticated(true);
    return res.user;
  };

  const register = async (data: any): Promise<User> => {
    const res = await registerApi(data);
    setToken(res.accessToken);
    setCurrentUser(res.user);
    setIsAuthenticated(true);
    await refreshUser();
    return res.user;
  };

  const logout = () => {
    clearStoredToken();
    setToken(null);
    setIsAuthenticated(false);
    // Switch to first cast member as guest
    if (cast.length > 0) {
      setCurrentUser(cast[0]);
    }
  };

  const quickLogin = async (user: User) => {
    try {
      // Story cast password seeded as 'password123'
      const identifier = user.email || user.phone;
      await login(identifier, 'password123');
    } catch {
      // If API unavailable, fallback locally
      setCurrentUser(user);
    }
  };

  const refreshUser = async () => {
    if (currentUser?.id) {
      const users = await fetchDemoCast();
      if (users && users.length > 0) setCast(users);

      const me = await fetchMeApi();
      if (me) {
        setCurrentUser(me);
      } else {
        const updated = users.find((u) => u.id === currentUser.id);
        if (updated) setCurrentUser(updated);
      }

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
        token,
        isAuthenticated,
        login,
        register,
        logout,
        quickLogin,
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
