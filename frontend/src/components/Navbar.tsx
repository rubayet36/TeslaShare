'use client';

import React from 'react';
import { useCast } from '../context/CastContext';
import { formatBdt } from '../lib/api';
import { Zap, Wallet, Car, UserCheck, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  const { cast, currentUser, setCurrentUser } = useCast();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/90 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-6 h-6 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Dhaka Tesla Pool
                </span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MVP v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Share a seat. Split the fare. Survive Dhaka traffic.
              </p>
            </div>
          </div>

          {/* Cast Quick-Switcher */}
          <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <span className="text-xs font-medium text-slate-400 px-2 hidden md:inline">
              Story Cast:
            </span>
            {cast
              .filter((c) => c.role === 'PASSENGER')
              .map((user) => {
                const isActive = currentUser.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => setCurrentUser(user)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{user.name}</span>
                  </button>
                );
              })}

            {/* Jashim Driver Toggle */}
            <Link
              href="/driver"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all flex items-center space-x-1.5"
            >
              <Car className="w-3.5 h-3.5 text-amber-400" />
              <span>Jashim (Bullet)</span>
            </Link>
          </div>

          {/* TeslaPay Wallet Pill */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 rounded-xl">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="text-right">
                <div className="text-xs font-bold text-emerald-400">
                  {formatBdt(currentUser?.walletPoysha || 0)}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {(currentUser?.walletPoysha || 0).toLocaleString()} Poysha
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
