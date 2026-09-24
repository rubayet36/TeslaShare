'use client';

import React, { useState, useEffect } from 'react';
import { useCast } from '../../context/CastContext';
import { fetchPoolsApi, updateRideStatusApi, formatBdt, fetchDemoCast, User } from '../../lib/api';
import {
  Car,
  Zap,
  Users,
  CheckCircle2,
  MapPin,
  Play,
  Check,
  AlertCircle,
  Phone,
  ArrowRight,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import Link from 'next/link';

export default function DriverDashboardPage() {
  const { cast, refreshUser } = useCast();

  // Find Jashim from story cast
  const jashim = cast.find((u) => u.name === 'Jashim') || {
    id: 'jashim-id',
    name: 'Jashim',
    phone: '+8801711000001',
    role: 'DRIVER' as const,
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
  };

  const [isOnline, setIsOnline] = useState(true);
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadPools = async () => {
    setLoading(true);
    try {
      const data = await fetchPoolsApi();
      setPools(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPools();
    const interval = setInterval(loadPools, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (rideId: string, nextStatus: string) => {
    setActionError(null);
    try {
      await updateRideStatusApi(rideId, nextStatus, jashim.id);
      await loadPools();
      await refreshUser();
    } catch (err: any) {
      setActionError(err.message || `Failed to transition ride to ${nextStatus}`);
    }
  };

  // Extract active pool for Bullet
  const activePool = pools.find(
    (p) => p.status === 'OPEN' || p.status === 'FULL' || p.status === 'IN_PROGRESS',
  ) || pools[0];

  const poolMembers = activePool?.members || [];
  const totalCapacity = activePool?.totalSeats || jashim.vehicle?.capacity || 3;
  const occupiedSeats = poolMembers.reduce((sum: number, m: any) => sum + (m.seats || 1), 0);
  const availableSeats = Math.max(0, totalCapacity - occupiedSeats);

  return (
    <div className="space-y-6">
      {/* Driver Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Driver Console • Banani Road 11 Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <span>Jashim & Bullet Dashboard</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl">
              Manage your 3-seat electric Tesla <strong className="text-amber-400">Bullet</strong>, monitor live seat occupancy, and drive Nusrat & Rafiq safely through Dhaka traffic.
            </p>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 transition"
            >
              <span>Switch to Passenger View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Online / Offline Status Toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center space-x-2 shadow-lg ${
                isOnline
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
              <span>{isOnline ? 'BULLET ONLINE (ACCEPTING RIDES)' : 'BULLET OFFLINE'}</span>
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Grid: Occupancy Widget & Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bullet 3-Seat Occupancy Widget */}
        <div className="space-y-6 lg:col-span-1">
          {/* Bullet Seat Occupancy Widget */}
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 text-white shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Bullet Seat Occupancy</h3>
                  <p className="text-xs text-slate-400">PRD Fixed Capacity: 3 Seats</p>
                </div>
              </div>
              <button
                onClick={loadPools}
                disabled={loading}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Occupancy Counter */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 mb-5 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 font-medium">Occupied Capacity</span>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {occupiedSeats} / {totalCapacity} Seats
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Status</span>
                <div
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border mt-0.5 ${
                    occupiedSeats === totalCapacity
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : occupiedSeats > 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {occupiedSeats === totalCapacity
                    ? 'FULL (3/3)'
                    : occupiedSeats > 0
                    ? `PARTIAL (${availableSeats} LEFT)`
                    : 'EMPTY (3 SEATS OPEN)'}
                </div>
              </div>
            </div>

            {/* Visual 3 Seats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3].map((seatNum) => {
                // Find member assigned to this seat index
                let memberForSeat: any = null;
                let accumulated = 0;
                for (const m of poolMembers) {
                  accumulated += m.seats || 1;
                  if (seatNum <= accumulated) {
                    memberForSeat = m;
                    break;
                  }
                }

                const isOccupied = !!memberForSeat;
                const passengerName = memberForSeat?.rideRequest?.passenger?.name || 'Assigned Rider';

                return (
                  <div
                    key={seatNum}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                      isOccupied
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/40 border-slate-800 text-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs mb-1.5">
                      {isOccupied ? '👤' : seatNum}
                    </div>
                    <span className="text-[11px] font-bold truncate max-w-full">
                      {isOccupied ? passengerName : 'Open Seat'}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5">
                      {isOccupied ? 'Reserved' : 'Available'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver Wallet & Earnings Card */}
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 text-white shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Jashim&apos;s Earnings</h3>
                <p className="text-xs text-slate-400">TeslaPay Driver Wallet Credit</p>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 mb-3 flex justify-between items-baseline">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Total Wallet Balance
                </span>
                <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                  {formatBdt(jashim.walletPoysha)}
                </div>
              </div>
              <div className="text-right font-mono text-xs text-slate-400">
                {jashim.walletPoysha.toLocaleString()} Poysha
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Rides & Trip Lifecycle Controls */}
        <div className="space-y-6 lg:col-span-2">
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 text-white shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Active Pool & Passenger Roster</h3>
                  <p className="text-xs text-slate-400">
                    Control trip stages: Driver Arrived → Start Trip → Complete Trip
                  </p>
                </div>
              </div>
            </div>

            {/* List of Ride Requests in Pool */}
            <div className="space-y-4">
              {poolMembers.length > 0 ? (
                poolMembers.map((member: any) => {
                  const req = member.rideRequest;
                  const passenger = req?.passenger;
                  const status = req?.status;

                  return (
                    <div
                      key={member.id}
                      className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
                            👤
                          </div>
                          <div>
                            <div className="font-extrabold text-base text-white">
                              {passenger?.name || 'Passenger'}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center space-x-2">
                              <span className="flex items-center space-x-1 text-emerald-400">
                                <MapPin className="w-3 h-3" />
                                <span>{req?.pickupZone}</span>
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-600" />
                              <span className="text-slate-200 font-semibold">{req?.destinationZone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold font-mono text-emerald-400">
                            {formatBdt(req?.estimatedFarePoysha || member.individualFarePoysha)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {(req?.estimatedFarePoysha || 0).toLocaleString()} Poysha
                          </div>
                        </div>
                      </div>

                      {/* Driver Controls Step Bar for this passenger */}
                      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                          <span className="font-semibold text-slate-300">Status:</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {status}
                          </span>
                        </div>

                        {/* Lifecycle Action Buttons */}
                        <div className="flex items-center space-x-2">
                          {status === 'MATCHED' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'DRIVER_ARRIVED')}
                              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-amber-500 text-slate-950 hover:bg-amber-400 transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Mark Arrived (Banani)</span>
                            </button>
                          )}

                          {status === 'DRIVER_ARRIVED' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'STARTED')}
                              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-blue-500 text-slate-950 hover:bg-blue-400 transition flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Trip</span>
                            </button>
                          )}

                          {status === 'STARTED' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'COMPLETED')}
                              className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Complete & Collect Fare</span>
                            </button>
                          )}

                          {status === 'COMPLETED' && (
                            <div className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Fare Settled in TeslaPay</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  <Car className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="font-semibold text-slate-300">No active passengers assigned to Bullet right now.</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Switch to the passenger view as Nusrat or Rafiq to request a ride from Banani!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
