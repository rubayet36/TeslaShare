'use client';

import React, { useState } from 'react';
import { useCast } from '../context/CastContext';
import { WalletCard } from '../components/WalletCard';
import { RideHistoryCard } from '../components/RideHistoryCard';
import { BookingPanel } from '../components/BookingPanel';
import { LiveTracker } from '../components/LiveTracker';
import DhakaMapDynamic from '../components/DhakaMapDynamic';
import { AuthStandaloneView } from '../components/AuthStandaloneView';
import { MapPin, Users, Zap, Shield, Sparkles, Car, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PassengerPage() {
  const { currentUser, isAuthenticated } = useCast();
  const [mapPickup, setMapPickup] = useState('Banani');
  const [mapDestination, setMapDestination] = useState('Mohakhali');

  // IF NOT AUTHENTICATED: RENDER SIGN IN / SIGN UP PAGE ONLY
  if (!isAuthenticated || !currentUser) {
    return <AuthStandaloneView initialTab="login" />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dhaka Tesla Pool • Electric Passenger Console</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome, {currentUser.name}!
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Select your pickup and destination on the map below to request a ride. Match compatible Tesla pools across Dhaka, enjoy fixed 3-seat capacity protection, and save 30% on your fare.
          </p>

          {/* If a Driver logs into the passenger page, offer quick switch to driver console */}
          {currentUser.role === 'DRIVER' && (
            <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-amber-300 font-semibold">
                <Car className="w-4 h-4 text-amber-400" />
                <span>You are signed in with a Driver account ({currentUser.name}). Switch to your Driver Console to accept passenger requests.</span>
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
              <span>100% Electric Commuting</span>
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
        {/* Left Column: Wallet & Profile */}
        <div className="space-y-6 lg:col-span-1">
          <WalletCard />

          {/* Passenger Info Card */}
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
              {currentUser.email && (
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Email</span>
                  <span className="font-mono text-slate-200">{currentUser.email}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Account Role</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Tracker, Map, Booking Panel, and History */}
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
    </div>
  );
}
