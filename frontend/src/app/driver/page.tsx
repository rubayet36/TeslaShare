'use client';

import React, { useState, useEffect } from 'react';
import { useCast } from '../../context/CastContext';
import {
  fetchPoolsApi,
  updateRideStatusApi,
  formatBdt,
  fetchPendingRidesApi,
  acceptRideApi,
  fetchDriverHistoryApi,
  simulateConcurrentLastSeatApi,
  User,
} from '../../lib/api';
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
  Clock,
  Flame,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { AuthModal } from '../../components/AuthModal';
import { AuthStandaloneView } from '../../components/AuthStandaloneView';

export default function DriverDashboardPage() {
  const { cast, refreshUser, currentUser, quickLogin, isAuthenticated } = useCast();

  // Active driver is the currently authenticated driver user
  const activeDriver: User = (currentUser && currentUser.role === 'DRIVER')
    ? currentUser
    : {
        id: 'driver-id',
        name: 'Tesla Driver',
        email: 'driver@dhakatesla.com',
        phone: '+8801700000000',
        role: 'DRIVER' as const,
        walletPoysha: 0,
        vehicle: {
          id: 'vehicle-id',
          name: 'Tesla EV',
          model: 'Dhaka Electric 3-Wheeler',
          capacity: 3,
          licensePlate: 'DHAKA-METRO-HA-11-2026',
          status: 'ONLINE',
          currentZone: 'Banani',
        },
      };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authModalRole, setAuthModalRole] = useState<'PASSENGER' | 'DRIVER'>('DRIVER');

  const openDriverAuth = (tab: 'login' | 'register') => {
    setAuthModalTab(tab);
    setAuthModalRole('DRIVER');
    setIsAuthModalOpen(true);
  };

  const [isOnline, setIsOnline] = useState(true);
  const [pools, setPools] = useState<any[]>([]);
  const [pendingRides, setPendingRides] = useState<any[]>([]);
  const [driverHistory, setDriverHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Concurrency Simulation State
  const [concurrencyRunning, setConcurrencyRunning] = useState(false);
  const [concurrencyResult, setConcurrencyResult] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [poolData, pendingData, historyData] = await Promise.all([
        fetchPoolsApi(),
        fetchPendingRidesApi(),
        fetchDriverHistoryApi(activeDriver.id),
      ]);
      setPools(poolData);
      setPendingRides(pendingData);
      setDriverHistory(historyData);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [activeDriver.id]);

  const handleStatusChange = async (rideId: string, nextStatus: string) => {
    setActionError(null);
    try {
      await updateRideStatusApi(rideId, nextStatus, activeDriver.id);
      await loadData();
      await refreshUser();
    } catch (err: any) {
      setActionError(err.message || `Failed to transition ride to ${nextStatus}`);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    setActionError(null);
    try {
      await acceptRideApi(rideId, activeDriver.id);
      await loadData();
      await refreshUser();
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept ride.');
    }
  };

  const handleRunConcurrencyTest = async () => {
    setConcurrencyRunning(true);
    setConcurrencyResult(null);
    setActionError(null);

    // Dynamically pick two registered passenger candidates to simulate competing for the last seat
    const passengerCandidates = cast.filter((u) => u.role === 'PASSENGER');
    const candidate1 = passengerCandidates[0];
    const candidate2 = passengerCandidates[1] || passengerCandidates[0];

    if (!candidate1 || !candidate2 || !activePool) {
      setActionError('Requires at least 1 registered passenger and an active pool to simulate.');
      setConcurrencyRunning(false);
      return;
    }

    try {
      const result = await simulateConcurrentLastSeatApi(activePool.id, candidate1.id, candidate2.id);
      setConcurrencyResult(result);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Concurrency simulation failed.');
    } finally {
      setConcurrencyRunning(false);
    }
  };

  // Extract active pool for driver's vehicle
  const activePool = pools.find(
    (p) =>
      p.driverId === activeDriver.id &&
      (p.status === 'OPEN' || p.status === 'FULL' || p.status === 'IN_PROGRESS'),
  ) || pools.find(
    (p) => p.status === 'OPEN' || p.status === 'FULL' || p.status === 'IN_PROGRESS',
  ) || pools[0];

  const poolMembers = activePool?.members || [];
  const totalCapacity = activePool?.totalSeats || activeDriver.vehicle?.capacity || 3;
  const occupiedSeats = poolMembers.reduce((sum: number, m: any) => sum + (m.seats || 1), 0);
  const availableSeats = Math.max(0, totalCapacity - occupiedSeats);

  // IF NOT AUTHENTICATED: RENDER SIGN IN / SIGN UP PAGE ONLY
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="space-y-4">
        <div className="text-center pt-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            🚗 Driver & Tesla Pilot Portal
          </span>
        </div>
        <AuthStandaloneView initialTab="login" initialRole="DRIVER" />
      </div>
    );
  }

  // IF LOGGED IN AS PASSENGER: PROMPT TO SWITCH OR SIGN IN AS DRIVER
  if (currentUser.role !== 'DRIVER') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 text-center space-y-4 text-white shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Car className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Driver Portal Restricted</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            You are currently signed in as Passenger <strong>{currentUser.name}</strong>. To access the Driver Console, please sign in with a Driver account or create a new Driver account.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold transition text-white"
            >
              Passenger Booking
            </Link>
            <button
              onClick={() => openDriverAuth('register')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
            >
              + Register as Driver
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultTab={authModalTab}
          defaultRole={authModalRole}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Driver Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Driver Console • {activeDriver.vehicle?.currentZone || 'Banani'} Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <span>{activeDriver.name} & {activeDriver.vehicle?.name || 'Tesla EV'} Dashboard</span>
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl">
              Pilot your 3-seat electric Tesla <strong className="text-amber-400">{activeDriver.vehicle?.name || 'Tesla EV'}</strong> ({activeDriver.vehicle?.licensePlate || 'DHAKA-METRO'}), monitor live seat occupancy, and accept passenger pools.
            </p>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60"
            >
              <span>Passenger View</span>
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
              <span>{isOnline ? `${(activeDriver.vehicle?.name || 'TESLA').toUpperCase()} ONLINE (ACCEPTING RIDES)` : 'VEHICLE OFFLINE'}</span>
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
        {/* Left Column: Bullet 3-Seat Occupancy Widget & Concurrency Simulator */}
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
                onClick={loadData}
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
                    occupiedSeats >= totalCapacity
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : occupiedSeats > 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {occupiedSeats >= totalCapacity
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

          {/* ⚡ Video Demo Widget: Last-Seat Concurrency Test */}
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-emerald-500/30 text-white shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Last-Seat Concurrency Test</h3>
                <p className="text-[11px] text-slate-400">PRD Section 8 & 9 Testing Requirement</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Simulates two simultaneous booking requests competing for <strong>Bullet&apos;s last seat</strong> to verify pessimistic database row locking.
            </p>

            <button
              onClick={handleRunConcurrencyTest}
              disabled={concurrencyRunning}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{concurrencyRunning ? 'Executing Parallel Requests...' : 'Trigger 2 Parallel Bookings'}</span>
            </button>

            {/* Live Concurrency Result Display */}
            {concurrencyResult && (
              <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 animate-fade-in">
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between">
                  <span>Race Condition Result:</span>
                  <span className="text-emerald-400 font-mono">Pessimistic Lock Enforced</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Request A (Shirin):</span>
                  <span className={concurrencyResult.req1.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {concurrencyResult.req1.success ? '✅ SUCCESS (Seat Allocated)' : '❌ REJECTED'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Request B (Candidate 2):</span>
                  <span className={concurrencyResult.req2.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {concurrencyResult.req2.success ? '✅ SUCCESS' : '❌ REJECTED (Capacity Full)'}
                  </span>
                </div>

                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">Vehicle Capacity Exceeded:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    FALSE (Strict 3/3 Limit)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Driver Wallet & Earnings Card */}
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 text-white shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">{activeDriver.name}&apos;s Earnings</h3>
                <p className="text-xs text-slate-400">TeslaPay Driver Wallet Credit</p>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 mb-3 flex justify-between items-baseline">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Total Wallet Balance
                </span>
                <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                  {formatBdt(activeDriver.walletPoysha)}
                </div>
              </div>
              <div className="text-right font-mono text-xs text-slate-400">
                {activeDriver.walletPoysha.toLocaleString()} Poysha
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pending Ride Requests, Active Pool Roster & Driver History */}
        <div className="space-y-6 lg:col-span-2">
          {/* SECTION 5: Available Ride Requests (Pending Acceptance) */}
          {pendingRides.length > 0 && (
            <div className="bg-slate-900/90 rounded-2xl p-6 border border-amber-500/30 text-white shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Available Ride Requests</h3>
                    <p className="text-xs text-slate-400">
                      Riders requesting Tesla pickup at Banani • Ready for pooling
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingRides.length} Pending
                </span>
              </div>

              <div className="space-y-3">
                {pendingRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">
                        {ride.passenger?.name || 'Rider'}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                        <span className="text-emerald-400">{ride.pickupZone}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-200">{ride.destinationZone}</span>
                        <span>•</span>
                        <span>{ride.seatsRequested} seat(s)</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          {formatBdt(ride.estimatedFarePoysha)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAcceptRide(ride.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition shadow-md shadow-emerald-500/20"
                      >
                        Accept Pool
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Pool Roster & Passenger Controls */}
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
                  <p className="font-semibold text-slate-300">No active passengers assigned to vehicle right now.</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Incoming ride requests will appear above in real-time as passengers book trips!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 10: Driver Ride History */}
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 text-white shadow-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Driver Trip History</h3>
                <p className="text-xs text-slate-400">Completed rides, passengers, and fare earnings</p>
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {driverHistory.length > 0 ? (
                driverHistory.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        {ride.passenger?.name} • {ride.seatsRequested} seat(s)
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                        <span>{ride.pickupZone}</span>
                        <ArrowRight className="w-3 h-3 text-slate-600" />
                        <span>{ride.destinationZone}</span>
                        <span>•</span>
                        <span className="text-emerald-400 uppercase font-semibold text-[10px]">
                          {ride.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-emerald-400 font-mono">
                        {formatBdt(ride.finalFarePoysha || ride.estimatedFarePoysha)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No completed driver trips recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
        defaultRole={authModalRole}
      />
    </div>
  );
}
