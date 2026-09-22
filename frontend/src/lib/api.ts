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

export function poyshaToBdt(poysha: number): number {
  return Math.round((poysha / 100) * 100) / 100;
}

export function formatBdt(poysha: number): string {
  const bdt = poyshaToBdt(poysha);
  return `৳ ${bdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
