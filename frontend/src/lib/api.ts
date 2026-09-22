const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

export const FALLBACK_CAST: User[] = [
  {
    id: 'nusrat-id',
    name: 'Nusrat',
    email: 'nusrat@gmail.com',
    phone: '+8801811000002',
    role: 'PASSENGER',
    walletPoysha: 150000,
    transactions: [
      {
        id: 'tx-1',
        amountPoysha: 150000,
        type: 'TOPUP',
        description: 'TeslaPay Wallet initial top-up',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'rafiq-id',
    name: 'Rafiq',
    email: 'rafiq@gmail.com',
    phone: '+8801911000003',
    role: 'PASSENGER',
    walletPoysha: 120000,
    transactions: [
      {
        id: 'tx-2',
        amountPoysha: 120000,
        type: 'TOPUP',
        description: 'TeslaPay Wallet initial top-up',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'shirin-id',
    name: 'Shirin',
    email: 'shirin@gmail.com',
    phone: '+8801611000004',
    role: 'PASSENGER',
    walletPoysha: 100000,
    transactions: [
      {
        id: 'tx-3',
        amountPoysha: 100000,
        type: 'TOPUP',
        description: 'TeslaPay Wallet initial top-up',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'jashim-id',
    name: 'Jashim',
    email: 'jashim@tesla-pool.dhaka',
    phone: '+8801711000001',
    role: 'DRIVER',
    walletPoysha: 50000,
    vehicle: {
      id: 'bullet-id',
      name: 'Bullet',
      model: "Dhaka Electric 3-Wheeler 'Tesla' Bullet",
      capacity: 3,
      licensePlate: 'DHAKA-METRO-HA-11-2026',
      status: 'ONLINE',
      currentZone: 'Banani',
    },
    transactions: [],
  },
];

export async function fetchDemoCast(): Promise<User[]> {
  try {
    const res = await fetch(`${API_BASE}/users/demo-cast`, { cache: 'no-store' });
    if (!res.ok) throw new Error('API fetch failed');
    const data = await res.json();
    return data && data.length > 0 ? data : FALLBACK_CAST;
  } catch {
    return FALLBACK_CAST;
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

export function poyshaToBdt(poysha: number): number {
  return Math.round((poysha / 100) * 100) / 100;
}

export function formatBdt(poysha: number): string {
  const bdt = poyshaToBdt(poysha);
  return `৳ ${bdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


