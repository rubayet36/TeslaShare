'use client';

import React, { useEffect, useState } from 'react';
import { useCast } from '../context/CastContext';
import { fetchRideById, cancelRideRequest, RideRecord, formatBdt } from '../lib/api';
import {
  Car,
  User,
  CheckCircle2,
  Clock,
  Navigation,
  XCircle,
  RefreshCw,
  Phone,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
} from 'lucide-react';

export function LiveTracker() {
  const { activeRide, setActiveRide, currentUser, refreshUser } = useCast();
  const [ride, setRide] = useState<RideRecord | null>(activeRide);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    setRide(activeRide);
  }, [activeRide]);

  // Periodic polling for status changes (every 4 seconds)
  useEffect(() => {
    if (!ride || ride.status === 'COMPLETED' || ride.status === 'CANCELLED') return;

    const interval = setInterval(async () => {
      try {
        const updated = await fetchRideById(ride.id);
        setRide(updated);
        setActiveRide(updated);
        if (updated.status === 'COMPLETED') {
          await refreshUser();
        }
      } catch {
        // Silent catch for poll error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [ride?.id, ride?.status]);

  const handleManualRefresh = async () => {
    if (!ride) return;
    setRefreshing(true);
    try {
      const updated = await fetchRideById(ride.id);
      setRide(updated);
      setActiveRide(updated);
      await refreshUser();
    } catch {
      // Ignore
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = async () => {
    if (!ride || !currentUser) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelRideRequest(ride.id, currentUser.id, 'Cancelled by passenger');
      const updated = await fetchRideById(ride.id);
      setRide(updated);
      setActiveRide(null);
      await refreshUser();
    } catch (err: any) {
      setCancelError(err.message || 'Cannot cancel ride at this stage.');
    } finally {
      setCancelling(false);
    }
  };

  if (!ride) {
    return null;
  }

  const steps: Array<{ status: RideRecord['status']; label: string; desc: string }> = [
    { status: 'REQUESTED', label: 'Requested', desc: 'Searching for Tesla Bullet' },
    { status: 'MATCHED', label: 'Matched', desc: 'Jashim accepted pool' },
    { status: 'DRIVER_ARRIVED', label: 'Driver Arrived', desc: 'Bullet at Banani Road 11' },
    { status: 'STARTED', label: 'In Trip', desc: 'En route to destination' },
    { status: 'COMPLETED', label: 'Completed', desc: 'TeslaPay fare settled' },
  ];

  const getStepIndex = (status: RideRecord['status']) => {
    switch (status) {
      case 'REQUESTED':
        return 0;
      case 'MATCHED':
        return 1;
      case 'DRIVER_ARRIVED':
        return 2;
      case 'STARTED':
        return 3;
      case 'COMPLETED':
        return 4;
      case 'CANCELLED':
        return -1;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(ride.status);
  const isCancelled = ride.status === 'CANCELLED';
  const isCompleted = ride.status === 'COMPLETED';
  const canCancel = ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED'].includes(ride.status);

  return (
    <div className="bg-slate-900/95 rounded-3xl p-6 sm:p-7 border border-emerald-500/30 text-white shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Car className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-base sm:text-lg text-white">Live Trip Monitor</h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRD Lifecycle
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Trip ID: <span className="font-mono text-slate-300">{ride.id.slice(0, 8)}...</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700 disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Ride'}
            </button>
          )}
        </div>
      </div>

      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center space-x-3">
          <XCircle className="w-6 h-6 flex-shrink-0 text-rose-400" />
          <div>
            <div className="font-bold text-sm">Ride Cancelled</div>
            <p className="text-xs text-rose-200/80">
              Seat released back to Bullet pool. No TeslaPay deduction was charged.
            </p>
          </div>
        </div>
      )}

      {/* Completed Receipt Banner */}
      {isCompleted && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 text-emerald-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-white">Trip Completed & Paid!</h4>
              <p className="text-xs text-emerald-300/90">
                TeslaPay wallet settled automatically in integer Poysha.
              </p>
            </div>
          </div>
          <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400">Total Charged</span>
              <div className="font-mono font-bold text-lg text-white">
                {formatBdt(ride.finalFarePoysha || ride.estimatedFarePoysha)}
              </div>
            </div>
            {ride.poolDiscountPoysha > 0 && (
              <div className="text-right">
                <span className="text-emerald-400 font-semibold">30% Pool Discount Saved</span>
                <div className="font-mono text-emerald-300">
                  + {formatBdt(ride.poolDiscountPoysha)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lifecycle Progress Stepper */}
      {!isCancelled && (
        <div className="mb-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
          <div className="grid grid-cols-5 gap-2 text-center relative">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIdx;
              const isPassed = idx < currentStepIdx;

              return (
                <div key={step.status} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all mb-2 ${
                      isPassed
                        ? 'bg-emerald-500 text-slate-950 font-extrabold'
                        : isActive
                        ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/30 font-extrabold animate-pulse'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold leading-tight ${
                      isActive ? 'text-emerald-400' : isPassed ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[9px] text-slate-500 hidden sm:block mt-0.5 max-w-[80px]">
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Matched Driver & Vehicle Details (Jashim & Bullet) */}
      {ride.pool && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Driver Card */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-base">
              👨‍✈️
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Assigned Driver
              </div>
              <div className="font-extrabold text-white text-sm">
                {ride.pool.driver?.name || 'Jashim'}
              </div>
              <div className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>{ride.pool.driver?.phone || '+8801711000001'}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Bullet Card */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Electric 3-Wheeler
              </div>
              <div className="font-extrabold text-white text-sm">
                {ride.pool.vehicle?.name || 'Bullet'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Capacity: <strong className="text-slate-200">3 Seats</strong> •{' '}
                <span className="font-mono text-[11px] text-slate-300">
                  {ride.pool.vehicle?.licensePlate || 'HA-11-2026'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Passenger Receipt & Privacy Protection */}
      <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-medium">
            Individual Fare for <strong>{currentUser?.name || 'Rider'}</strong> ({ride.seatsRequested} seat):
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="font-mono text-emerald-400 font-bold text-sm">
            {formatBdt(ride.estimatedFarePoysha)}
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            ({ride.estimatedFarePoysha.toLocaleString()} Poysha)
          </span>
        </div>
      </div>

      {cancelError && (
        <div className="mt-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{cancelError}</span>
        </div>
      )}
    </div>
  );
}
