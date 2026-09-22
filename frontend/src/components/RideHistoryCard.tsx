'use client';

import React from 'react';
import { useCast } from '../context/CastContext';
import { formatBdt } from '../lib/api';
import { Clock, MapPin, CheckCircle2, XCircle, ArrowRight, Car } from 'lucide-react';

export function RideHistoryCard() {
  const { userRides, currentUser } = useCast();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Cancelled</span>
          </span>
        );
      case 'STARTED':
      case 'DRIVER_ARRIVED':
      case 'MATCHED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse flex items-center space-x-1">
            <Car className="w-3 h-3" />
            <span>In Progress</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 text-white shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">{currentUser.name}&apos;s Ride History</h3>
            <p className="text-xs text-slate-400">Past Tesla trips & individual fare receipts</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {userRides.length > 0 ? (
          userRides.map((ride) => (
            <div
              key={ride.id}
              className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                  <span>{ride.pickupZone}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span>{ride.destinationZone}</span>
                </div>
                {getStatusBadge(ride.status)}
              </div>

              <div className="flex items-center justify-between text-slate-400 text-[11px] pt-2 border-t border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <span>{new Date(ride.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{ride.seatsRequested} Seat(s)</span>
                  {ride.poolDiscountPoysha > 0 && (
                    <span className="text-emerald-400 font-medium">
                      (Saved {formatBdt(ride.poolDiscountPoysha)})
                    </span>
                  )}
                </div>
                <div className="font-bold text-white font-mono text-xs">
                  {formatBdt(ride.finalFarePoysha || ride.estimatedFarePoysha)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-xs text-slate-500">
            <Car className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>No ride history yet for {currentUser.name}.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Book a ride from Banani to Mohakhali or Gulshan 1 to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
