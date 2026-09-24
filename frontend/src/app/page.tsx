'use client';

import React, { useState } from 'react';
import { useCast } from '../context/CastContext';
import { WalletCard } from '../components/WalletCard';
import { RideHistoryCard } from '../components/RideHistoryCard';
import { BookingPanel } from '../components/BookingPanel';
import { LiveTracker } from '../components/LiveTracker';
import DhakaMapDynamic from '../components/DhakaMapDynamic';
import { AuthModal } from '../components/AuthModal';
import { MapPin, Users, Zap, Shield, Sparkles, LogIn, UserPlus, Car, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PassengerPage() {
  const { currentUser, isAuthenticated } = useCast();
  const [mapPickup, setMapPickup] = useState('Banani');
  const [mapDestination, setMapDestination] = useState('Mohakhali');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  const openAuth = (tab: 'login' | 'register') => {
    setAuthTab(tab);
    setIsAuthOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dhaka Tesla Pool • Zero-Emission Electric Ride Sharing</span>
          </div>

          {isAuthenticated && currentUser ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {currentUser.name}! Ready to split a Tesla?
              </h1>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Select your pickup and destination on the map below. The system checks active Tesla routes in Dhaka, matches compatible riders, guarantees fixed capacity (max 3), and splits fares by 30%.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Electric Ride Pooling in Dhaka • Zero Emissions
              </h1>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                Share a 3-seat Tesla with fellow commuters. Interactive map route selection, strict capacity protection, cashless integer-precision fares, and individual passenger billing.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => openAuth('register')}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-500/20 flex items-center space-x-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account (Passenger / Driver)</span>
                </button>

                <button
                  onClick={() => openAuth('login')}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center space-x-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Sign In with JWT</span>
                </button>
              </div>
            </>
          )}

          {/* If logged in as DRIVER on passenger page, prompt to open driver console */}
          {currentUser && currentUser.role === 'DRIVER' && (
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                <Car className="w-4 h-4 text-amber-400" />
                <span>You are signed in as a Driver ({currentUser.name}). Switch to your driver console to accept incoming pools!</span>
              </div>
              <Link
                href="/driver"
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition flex items-center space-x-1"
              >
                <span>Driver Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>100% Battery-Powered 3-Wheeler</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-teal-400" />
              <span>Max 3 Passengers • Never Overbooked</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>TeslaPay Cashless Protection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Booking, Wallet, Profile & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Wallet & Quick Profile */}
        <div className="space-y-6 lg:col-span-1">
          <WalletCard />

          {/* Passenger Info Card */}
          {currentUser ? (
            <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 text-white backdrop-blur-sm">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Active Commuter Profile
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Name</span>
                  <span className="font-semibold text-slate-200">{currentUser.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Phone</span>
                  <span className="font-mono text-slate-200">{currentUser.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Frequent Hub</span>
                  <span className="font-medium text-emerald-400 flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>Banani Hub</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Role</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 text-white backdrop-blur-sm space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                How Pooling Works
              </h4>
              <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside leading-relaxed">
                <li>
                  <strong className="text-emerald-400">1st Rider:</strong> Selects pickup and destination on the map and creates a pool request.
                </li>
                <li>
                  <strong className="text-amber-400">Tesla Driver:</strong> Reviews the incoming ride request on their dashboard and accepts it.
                </li>
                <li>
                  <strong className="text-teal-400">2nd & 3rd Riders:</strong> See the active Tesla route on the map, select matching stops, and join the pool with a 30% discount!
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Right Column: Live Tracker, Booking Panel, Leaflet Map & Ride History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Real-time Ride Tracker Monitor */}
          <LiveTracker />

          {/* Interactive Leaflet Map Visualizer */}
          <div className="space-y-2">
            <DhakaMapDynamic
              selectedPickup={mapPickup}
              selectedDestination={mapDestination}
              onSelectPickup={setMapPickup}
              onSelectDestination={setMapDestination}
            />
          </div>

          {/* Booking Panel with Real-time Fare Calculator */}
          <BookingPanel
            pickup={mapPickup}
            destination={mapDestination}
            onPickupChange={setMapPickup}
            onDestinationChange={setMapDestination}
          />

          <RideHistoryCard />
        </div>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultTab={authTab}
      />
    </div>
  );
}
