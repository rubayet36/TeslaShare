const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

export interface User {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  walletPoysha: number;
  vehicle?: {
    id: string;
    name: string;
    model: string;
    capacity: number;
    licensePlate: string;
    status: string;
    currentZone: string;
  };
  transactions?: Array<{
    id: string;
    amountPoysha: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

export const TOKEN_STORAGE_KEY = 'dhaka_tesla_pool_jwt_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function loginApi(identifier: string, password: string): Promise<{ accessToken: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed. Check your phone/email and password.');
  }

  const data = await res.json();
  if (data.accessToken) {
    setStoredToken(data.accessToken);
  }
  return data;
}

export async function registerApi(data: {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role?: 'PASSENGER' | 'DRIVER';
  vehicleName?: string;
  vehicleModel?: string;
  licensePlate?: string;
}): Promise<{ accessToken: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Registration failed.');
  }

  const resData = await res.json();
  if (resData.accessToken) {
    setStoredToken(resData.accessToken);
  }
  return resData;
}

export async function fetchMeApi(token?: string): Promise<User | null> {
  const authToken = token || getStoredToken();
  if (!authToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      clearStoredToken();
      return null;
    }

    return await res.json();
  } catch {
    return null;
  }
}

export interface RideRecord {
  id: string;
  passengerId: string;
  pickupZone: string;
  destinationZone: string;
  seatsRequested: number;
  estimatedFarePoysha: number;
  finalFarePoysha: number | null;
  poolDiscountPoysha: number;
  status: 'REQUESTED' | 'MATCHED' | 'DRIVER_ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  pool?: {
    id: string;
    driver: { name: string; phone: string };
    vehicle: { name: string; model: string; capacity: number; licensePlate: string };
  };
}

export async function fetchDemoCast(): Promise<User[]> {
  try {
    const res = await fetch(`${API_BASE}/users/demo-cast`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchUserRides(userId: string): Promise<RideRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/rides/user/${userId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface FareQuote {
  pickupZone: string;
  destinationZone: string;
  distanceKm: number;
  seats: number;
  isPooled: boolean;
  baseFarePoysha: number;
  distanceChargePoysha: number;
  soloTotalPoysha: number;
  poolDiscountPoysha: number;
  finalFarePoysha: number;
  baseFareBdt: number;
  distanceChargeBdt: number;
  soloTotalBdt: number;
  poolDiscountBdt: number;
  finalFareBdt: number;
  handTestFormula: string;
}

export async function fetchFareEstimate(
  pickupZone: string,
  destinationZone: string,
  isPooled = true,
  seats = 1,
): Promise<FareQuote> {
  try {
    const res = await fetch(`${API_BASE}/fares/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupZone, destinationZone, isPooled, seats }),
    });
    if (!res.ok) throw new Error('Fare API failed');
    const json = await res.json();
    return json.data;
  } catch {
    // Fallback formula math (PRD Section 5)
    const dist =
      pickupZone.toLowerCase() === destinationZone.toLowerCase()
        ? 0.5
        : destinationZone.includes('Gulshan')
        ? 2.8
        : destinationZone.includes('Mohakhali')
        ? 2.6
        : 3.5;

    const baseFarePoysha = 3000 * seats;
    const distanceChargePoysha = Math.round(dist * 1500 * seats);
    const soloTotal = baseFarePoysha + distanceChargePoysha;
    const discount = isPooled ? Math.round(soloTotal * 0.3) : 0;
    const finalFare = soloTotal - discount;

    return {
      pickupZone,
      destinationZone,
      distanceKm: dist,
      seats,
      isPooled,
      baseFarePoysha,
      distanceChargePoysha,
      soloTotalPoysha: soloTotal,
      poolDiscountPoysha: discount,
      finalFarePoysha: finalFare,
      baseFareBdt: poyshaToBdt(baseFarePoysha),
      distanceChargeBdt: poyshaToBdt(distanceChargePoysha),
      soloTotalBdt: poyshaToBdt(soloTotal),
      poolDiscountBdt: poyshaToBdt(discount),
      finalFareBdt: poyshaToBdt(finalFare),
      handTestFormula: `Base ৳${poyshaToBdt(baseFarePoysha)} + Dist ৳${poyshaToBdt(distanceChargePoysha)} - Pool ৳${poyshaToBdt(discount)} = ৳${poyshaToBdt(finalFare)}`,
    };
  }
}

export async function submitRideRequest(
  passengerId: string,
  pickupZone: string,
  destinationZone: string,
  seatsRequested = 1,
  isPooled = true,
): Promise<RideRecord> {
  const res = await fetch(`${API_BASE}/rides/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passengerId,
      pickupZone,
      destinationZone,
      seatsRequested,
      isPooled,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit ride request');
  }

  return await res.json();
}

export async function cancelRideRequest(rideId: string, userId: string, reason?: string) {
  const res = await fetch(`${API_BASE}/rides/${rideId}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, reason }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to cancel ride');
  }

  return await res.json();
}

export async function fetchRideById(rideId: string): Promise<RideRecord> {
  const res = await fetch(`${API_BASE}/rides/${rideId}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Ride not found');
  return await res.json();
}

export async function fetchPoolsApi(status?: string): Promise<any[]> {
  try {
    const url = status ? `${API_BASE}/pools?status=${status}` : `${API_BASE}/pools`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function updateRideStatusApi(rideId: string, status: string, driverId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, driverId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to update ride status to ${status}`);
  }

  return await res.json();
}

export async function fetchPendingRidesApi(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/rides/pending`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function acceptRideApi(rideId: string, driverId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rides/${rideId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to accept ride into pool.');
  }

  return await res.json();
}

export async function fetchDriverHistoryApi(driverId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/rides/driver/${driverId}/history`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function simulateConcurrentLastSeatApi(
  poolId: string,
  userAId: string,
  userBId: string,
): Promise<{ req1: any; req2: any }> {
  // 1. Create two simultaneous ride requests
  const [res1, res2] = await Promise.allSettled([
    submitRideRequest(userAId, 'Banani', 'Mohakhali', 1, true),
    submitRideRequest(userBId, 'Banani', 'Gulshan 1', 1, true),
  ]);

  return {
    req1: res1.status === 'fulfilled' ? { success: true, data: res1.value } : { success: false, error: (res1.reason as Error).message },
    req2: res2.status === 'fulfilled' ? { success: true, data: res2.value } : { success: false, error: (res2.reason as Error).message },
  };
}

export function poyshaToBdt(poysha: number): number {
  return Math.round((poysha / 100) * 100) / 100;
}

export function formatBdt(poysha: number): string {
  const bdt = poyshaToBdt(poysha);
  return `৳ ${bdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}




