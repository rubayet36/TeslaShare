'use client';

import React, { useState } from 'react';
import { useCast } from '../context/CastContext';
import { formatBdt } from '../lib/api';
import { Zap, Wallet, Car, UserCheck, ShieldCheck, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { AuthModal } from './AuthModal';

export function Navbar() {
  const { cast, currentUser, quickLogin, logout, isAuthenticated } = useCast();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const openAuth = (tab: 'login' | 'register') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-900/90 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all">
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
            </Link>

            {/* Role Portal Indicator - solely defined by authentication */}
            {isAuthenticated && currentUser && (
              <div className="hidden sm:flex items-center">
                {currentUser.role === 'DRIVER' ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <Car className="w-4 h-4 text-amber-400" />
                    <span>Tesla Driver Console</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                    <UserIcon className="w-4 h-4 text-emerald-400" />
                    <span>Passenger Booking Portal</span>
                  </div>
                )}
              </div>
            )}

            {/* Auth Controls & TeslaPay Wallet Pill */}
            <div className="flex items-center space-x-3">
              {/* Wallet Pill - only when logged in */}
              {isAuthenticated && currentUser && (
                <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-400">
                      {formatBdt(currentUser.walletPoysha || 0)}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      {(currentUser.walletPoysha || 0).toLocaleString()} Poysha
                    </div>
                  </div>
                </div>
              )}

              {/* Real JWT Auth Login / Register / Logout */}
              {isAuthenticated && currentUser ? (
                <div className="flex items-center space-x-2 bg-slate-800/60 border border-slate-700/80 px-2.5 py-1.5 rounded-xl">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-200">{currentUser.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Logout (Remove JWT Token)"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition-all ml-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => openAuth('login')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center space-x-1"
                  >
                    <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sign In</span>
                  </button>
                  <button
                    onClick={() => openAuth('register')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 hidden sm:flex items-center space-x-1"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  );
}
