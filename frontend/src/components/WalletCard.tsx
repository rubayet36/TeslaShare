'use client';

import React, { useState } from 'react';
import { useCast } from '../context/CastContext';
import { formatBdt } from '../lib/api';
import { Wallet, PlusCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';

export function WalletCard() {
  const { currentUser, topUpWallet } = useCast();
  const [showTopUpNotice, setShowTopUpNotice] = useState(false);

  const handleTopUp = (amountBdt: number) => {
    topUpWallet(amountBdt);
    setShowTopUpNotice(true);
    setTimeout(() => setShowTopUpNotice(false), 3000);
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 text-white shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">TeslaPay Wallet</h3>
            <p className="text-xs text-slate-400">Simulated Digital Wallet (PRD Section 5)</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Active</span>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800/80 mb-4">
        <div className="flex justify-between items-baseline">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
              Available Balance
            </span>
            <div className="text-3xl font-extrabold text-white mt-0.5">
              {formatBdt(currentUser.walletPoysha)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium">Integer Units</span>
            <div className="text-sm font-semibold text-emerald-400 font-mono">
              {currentUser.walletPoysha.toLocaleString()} Poysha
            </div>
            <div className="text-[10px] text-slate-400">1 BDT = 100 Poysha</div>
          </div>
        </div>

        {showTopUpNotice && (
          <div className="mt-3 text-xs bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg flex items-center justify-between animate-fade-in">
            <span>✨ Wallet topped up successfully!</span>
          </div>
        )}
      </div>

      {/* Quick Top-up Simulation */}
      <div className="mb-5">
        <div className="text-xs text-slate-400 font-medium mb-2 flex items-center justify-between">
          <span>Simulate Instant Top-up</span>
          <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[100, 500, 1000].map((amt) => (
            <button
              key={amt}
              onClick={() => handleTopUp(amt)}
              className="py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-emerald-500 transition-all flex items-center justify-center space-x-1"
            >
              <span>+৳{amt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
          Recent Activity
        </h4>
        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
          {currentUser.transactions && currentUser.transactions.length > 0 ? (
            currentUser.transactions.slice(0, 4).map((tx) => {
              const isCredit = tx.amountPoysha > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between text-xs bg-slate-800/40 p-2.5 rounded-lg border border-slate-800"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center ${
                        isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200 truncate max-w-[140px]">
                        {tx.description}
                      </div>
                      <div className="text-[10px] text-slate-400" suppressHydrationWarning>
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-bold font-mono ${
                      isCredit ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {isCredit ? '+' : ''}
                    {formatBdt(Math.abs(tx.amountPoysha))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-xs text-slate-400">
              No recent wallet transactions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
