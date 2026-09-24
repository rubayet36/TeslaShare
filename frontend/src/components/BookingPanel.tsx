'use client';

import React, { useState, useEffect } from 'react';
import { useCast } from '../context/CastContext';
import { DHAKA_MAP_ZONES } from '../lib/zones';
import { fetchFareEstimate, submitRideRequest, fetchPoolsApi, FareQuote, formatBdt } from '../lib/api';
import { MapPin, Navigation, Users, Zap, Shield, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { AuthModal } from './AuthModal';

interface BookingPanelProps {
  pickup?: string;
  destination?: string;
  onPickupChange?: (pickup: string) => void;
  onDestinationChange?: (destination: string) => void;
  onRouteSelected?: (pickup: string, destination: string) => void;
}

export function BookingPanel({
  pickup: externalPickup,
  destination: externalDestination,
  onPickupChange,
  onDestinationChange,
  onRouteSelected,
}: BookingPanelProps) {
  const { currentUser, setActiveRide, refreshUser } = useCast();

  // Internal fallback state if props not provided
  const [internalPickup, setInternalPickup] = useState('Banani');
  const [internalDestination, setInternalDestination] = useState('Mohakhali');

  const pickup = externalPickup !== undefined ? externalPickup : internalPickup;
  const destination = externalDestination !== undefined ? externalDestination : internalDestination;

  const handlePickupChange = (newVal: string) => {
    if (onPickupChange) onPickupChange(newVal);
    else setInternalPickup(newVal);
    if (onRouteSelected) onRouteSelected(newVal, destination);
  };

  const handleDestinationChange = (newVal: string) => {
    if (onDestinationChange) onDestinationChange(newVal);
    else setInternalDestination(newVal);
    if (onRouteSelected) onRouteSelected(pickup, newVal);
  };

  const [seats, setSeats] = useState(1);
  const [isPooled, setIsPooled] = useState(true);
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Active Tesla route discovery for 2nd/3rd riders
  const [activeTeslaRoute, setActiveTeslaRoute] = useState<{
    pickup: string;
    destination: string;
    vehicleName: string;
    driverName: string;
    availableSeats: number;
    totalSeats: number;
  } | null>(null);

  useEffect(() => {
    const checkActiveTesla = async () => {
      try {
        const pools = await fetchPoolsApi();
        const active = pools.find((p) => p.status === 'OPEN' || p.status === 'IN_PROGRESS');
        if (active) {
          const firstMember = active.members?.[0]?.rideRequest;
          const originZone = firstMember?.pickupZone || active.pickupZone || 'Banani';
          const endZone = firstMember?.destinationZone || 'Mohakhali';
          setActiveTeslaRoute({
            pickup: originZone,
            destination: endZone,
            vehicleName: active.vehicle?.name || 'Tesla Bullet',
            driverName: active.driver?.name || 'Jashim',
            availableSeats: active.availableSeats ?? 1,
            totalSeats: active.totalSeats ?? 3,
          });
        } else {
          setActiveTeslaRoute(null);
        }
      } catch {
        // Silent catch
      }
    };

    checkActiveTesla();
    const interval = setInterval(checkActiveTesla, 5000);
    return () => clearInterval(interval);
  }, []);

  // Recalculate fare when parameters change
  useEffect(() => {
    let isCancelled = false;
    async function loadQuote() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchFareEstimate(pickup, destination, isPooled, seats);
        if (!isCancelled) {
          setQuote(res);
          if (onRouteSelected) onRouteSelected(pickup, destination);
        }
      } catch {
        if (!isCancelled) setError('Could not calculate fare.');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    loadQuote();
    return () => {
      isCancelled = true;
    };
  }, [pickup, destination, isPooled, seats]);

  const handleBooking = async () => {
    if (!currentUser) {
      setError('Please sign in or create an account first to book a Tesla ride.');
      setIsAuthModalOpen(true);
      return;
    }

    setBookingLoading(true);
    setError(null);
    setSuccessNotice(null);
    try {
      const ride = await submitRideRequest(currentUser.id, pickup, destination, seats, isPooled);
      setActiveRide(ride);
      setSuccessNotice(`Ride request submitted! Status: REQUESTED. Driver will review and accept your pool into the Tesla.`);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Booking failed. Bullet seat capacity may be reached.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-7 border border-slate-800 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Book a Tesla Pool</h3>
              <p className="text-xs text-slate-400">Zero-Emission Electric Commuting • Dhaka Hub</p>
            </div>
          </div>
          <div className="inline-flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Save 30%</span>
          </div>
        </div>

        {/* ACTIVE TESLA CORRIDOR NOTIFICATION (for 2nd / 3rd riders) */}
        {activeTeslaRoute && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-base">
                🚗⚡
              </div>
              <div>
                <div className="font-extrabold text-amber-300">
                  {activeTeslaRoute.vehicleName} is on Route: {activeTeslaRoute.pickup} ➔ {activeTeslaRoute.destination}
                </div>
                <p className="text-[11px] text-amber-200/80">
                  Driver: {activeTeslaRoute.driverName} • {activeTeslaRoute.availableSeats} of {activeTeslaRoute.totalSeats} seats open
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                handlePickupChange(activeTeslaRoute.pickup);
                handleDestinationChange(activeTeslaRoute.destination);
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer shadow-md shadow-amber-500/20"
            >
              ⚡ Match This Tesla Route
            </button>
          </div>
        )}

        {/* Inputs: Pickup & Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Pickup Location
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-amber-400" />
              <select
                value={pickup}
                onChange={(e) => handlePickupChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-9 pr-3 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {DHAKA_MAP_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.name}>
                    {zone.name} {zone.isHub ? '⚡ (Tesla Hub)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Destination Location
            </label>
            <div className="relative">
              <Navigation className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <select
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 pl-9 pr-3 text-sm font-medium text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {DHAKA_MAP_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.name}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Seats & Pooling Option */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Seats Needed
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSeats(num)}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border ${
                    seats === num
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {num} {num === 1 ? 'Seat' : 'Seats'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Ride Option
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPooled(true)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition border flex items-center justify-center space-x-1 ${
                  isPooled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pool (-30%)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPooled(false)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition border flex items-center justify-center space-x-1 ${
                  !isPooled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Solo (Full)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Fare Breakdown Card */}
        {quote && (
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-200">
                  {pickup} → {destination}
                </span>
              </div>
              <div className="font-mono text-emerald-400 font-bold">{quote.distanceKm} km</div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Base Boarding Fee</span>
                <span className="font-mono">৳ {quote.baseFareBdt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  Distance Charge ({quote.distanceKm}km × ৳15)
                </span>
                <span className="font-mono">৳ {quote.distanceChargeBdt.toFixed(2)}</span>
              </div>
              {isPooled && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>30% Pool Discount</span>
                  <span className="font-mono">- ৳ {quote.poolDiscountBdt.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Passenger Fare
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  ৳ {quote.finalFareBdt.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-emerald-400 font-mono">
                  {quote.finalFarePoysha.toLocaleString()} Poysha
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Integer Precision
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Errors or Notices */}
        {error && (
          <div className="mb-4 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl flex items-start space-x-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleBooking}
          disabled={bookingLoading}
          className="w-full py-3.5 px-4 rounded-xl text-sm font-extrabold bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {bookingLoading ? (
            <div className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
          ) : (
            <>
              <span>Request Ride with Tesla</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab="login"
      />
    </>
  );
}
