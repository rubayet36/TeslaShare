'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DHAKA_MAP_ZONES, MapZone } from '../lib/zones';
import { Zap, Navigation, MapPin, Target, Route } from 'lucide-react';

interface DhakaMapProps {
  selectedPickup?: string;
  selectedDestination?: string;
  onSelectPickup?: (zoneName: string) => void;
  onSelectDestination?: (zoneName: string) => void;
}

export default function DhakaMap({
  selectedPickup = 'Banani',
  selectedDestination = 'Mohakhali',
  onSelectPickup,
  onSelectDestination,
}: DhakaMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[420px] w-full rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
        Loading Dhaka Leaflet Map...
      </div>
    );
  }

  // Create custom marker icons
  const createCustomIcon = (isHub: boolean, isPickup: boolean, isDest: boolean) => {
    let bgClass = 'bg-slate-800 text-slate-200 border-slate-600';
    let iconEmoji = isHub ? '⚡' : '📍';

    if (isPickup) {
      bgClass = 'bg-emerald-500 text-slate-950 border-emerald-300 scale-125 ring-4 ring-emerald-500/30';
      iconEmoji = '📍';
    } else if (isDest) {
      bgClass = 'bg-cyan-500 text-slate-950 border-cyan-300 scale-125 ring-4 ring-cyan-500/30';
      iconEmoji = '🎯';
    } else if (isHub) {
      bgClass = 'bg-amber-400 text-slate-950 border-amber-300';
      iconEmoji = '⚡';
    }

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center transition-all ${bgClass}">
          <span style="font-size: 14px; font-weight: bold;">${iconEmoji}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const pickupZone = DHAKA_MAP_ZONES.find(
    (z) => z.name.toLowerCase() === selectedPickup.toLowerCase(),
  ) || DHAKA_MAP_ZONES[0];

  const destZone = DHAKA_MAP_ZONES.find(
    (z) => z.name.toLowerCase() === selectedDestination.toLowerCase(),
  ) || DHAKA_MAP_ZONES[3]; // Default Mohakhali

  // Dynamic route polyline connecting current selected pickup to destination
  const activeRouteCoords: [number, number][] = [
    [pickupZone.lat, pickupZone.lng],
    // Calculate intelligent midpoint curvature for realistic street visualization
    [
      (pickupZone.lat + destZone.lat) / 2 + (destZone.lng > pickupZone.lng ? 0.003 : -0.003),
      (pickupZone.lng + destZone.lng) / 2 + (destZone.lat > pickupZone.lat ? -0.003 : 0.003),
    ],
    [destZone.lat, destZone.lng],
  ];

  // Story reference corridors (dashed background lines)
  const banani = DHAKA_MAP_ZONES.find((z) => z.name === 'Banani')!;
  const mohakhali = DHAKA_MAP_ZONES.find((z) => z.name === 'Mohakhali')!;
  const gulshan1 = DHAKA_MAP_ZONES.find((z) => z.name === 'Gulshan 1')!;

  const nusratCorridor: [number, number][] = [
    [banani.lat, banani.lng],
    [mohakhali.lat, mohakhali.lng],
  ];
  const rafiqCorridor: [number, number][] = [
    [banani.lat, banani.lng],
    [gulshan1.lat, gulshan1.lng],
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Dynamic Map Header & Route Indicator */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Route className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">Active Route:</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
            {pickupZone.name} ➔ {destZone.name}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Pickup</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Destination</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Jashim Base (Banani ⚡)</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[420px] w-full">
        <MapContainer
          center={[pickupZone.lat, pickupZone.lng]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
        >
          {/* OpenStreetMap 100% Free Global Map Tiles - Zero API Key, No Watermarks */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Reference Story Corridors (Faint Background Lines) */}
          <Polyline
            positions={nusratCorridor}
            pathOptions={{ color: '#64748b', weight: 2, opacity: 0.4, dashArray: '4, 6' }}
          />
          <Polyline
            positions={rafiqCorridor}
            pathOptions={{ color: '#64748b', weight: 2, opacity: 0.4, dashArray: '4, 6' }}
          />

          {/* DYNAMIC SELECTED TRIP POLYLINE (Vibrant Emerald Glow) */}
          <Polyline
            positions={activeRouteCoords}
            pathOptions={{
              color: '#10b981',
              weight: 5,
              opacity: 0.9,
              dashArray: '8, 8',
            }}
          />

          {/* Dhaka Zone Pins */}
          {DHAKA_MAP_ZONES.map((zone) => {
            const isPickup = zone.name.toLowerCase() === selectedPickup.toLowerCase();
            const isDest = zone.name.toLowerCase() === selectedDestination.toLowerCase();

            return (
              <Marker
                key={zone.id}
                position={[zone.lat, zone.lng]}
                icon={createCustomIcon(!!zone.isHub, isPickup, isDest)}
              >
                <Popup className="custom-popup">
                  <div className="text-xs p-1 min-w-[150px]">
                    <div className="font-bold text-slate-900 flex items-center space-x-1">
                      {zone.isHub && <span>⚡</span>}
                      <span>{zone.name}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{zone.description}</p>
                    
                    <div className="mt-2.5 flex space-x-1.5">
                      <button
                        onClick={() => onSelectPickup && onSelectPickup(zone.name)}
                        className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-1.5 rounded transition"
                      >
                        Set Pickup
                      </button>
                      <button
                        onClick={() => onSelectDestination && onSelectDestination(zone.name)}
                        className="flex-1 text-[10px] bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-1 px-1.5 rounded transition"
                      >
                        Set Dest
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
