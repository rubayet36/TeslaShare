'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DHAKA_MAP_ZONES, MapZone } from '../lib/zones';
import { Zap, Navigation, MapPin } from 'lucide-react';

interface DhakaMapProps {
  selectedPickup?: string;
  selectedDestination?: string;
  onSelectZone?: (zoneName: string) => void;
}

export default function DhakaMap({
  selectedPickup = 'Banani',
  selectedDestination = 'Mohakhali',
  onSelectZone,
}: DhakaMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[400px] w-full rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
        Loading Dhaka Leaflet Map...
      </div>
    );
  }

  // Create custom marker icons
  const createCustomIcon = (isHub: boolean, isSelected: boolean) => {
    const bgClass = isHub
      ? 'bg-amber-400 text-slate-950 border-amber-300'
      : isSelected
      ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-125'
      : 'bg-slate-800 text-slate-200 border-slate-600';

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center transition-all ${bgClass}">
          <span style="font-size: 14px; font-weight: bold;">${isHub ? '⚡' : '📍'}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const banani = DHAKA_MAP_ZONES.find((z) => z.name === 'Banani')!;
  const mohakhali = DHAKA_MAP_ZONES.find((z) => z.name === 'Mohakhali')!;
  const gulshan1 = DHAKA_MAP_ZONES.find((z) => z.name === 'Gulshan 1')!;

  // Polylines for Nusrat (Banani -> Mohakhali) and Rafiq (Banani -> Gulshan 1)
  const nusratRouteCoords: [number, number][] = [
    [banani.lat, banani.lng],
    [23.7850, 90.4035], // Kemal Ataturk / Kakoli junction
    [mohakhali.lat, mohakhali.lng],
  ];

  const rafiqRouteCoords: [number, number][] = [
    [banani.lat, banani.lng],
    [23.7870, 90.4130], // Road 11 to Gulshan link
    [gulshan1.lat, gulshan1.lng],
  ];

  const sharedCorridorCoords: [number, number][] = [
    [mohakhali.lat, mohakhali.lng],
    [23.7780, 90.4095], // Bir Uttam Mir Shawkat connector
    [gulshan1.lat, gulshan1.lng],
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map Header / Legend Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">Dhaka Tesla Network Grid</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">• Live Leaflet Free Map</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Banani Hub (Jashim)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Nusrat Route</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Rafiq Route</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-slate-300">Shared Link</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[420px] w-full">
        <MapContainer
          center={[23.785, 90.41]}
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

          {/* Nusrat Route (Emerald) */}
          <Polyline
            positions={nusratRouteCoords}
            pathOptions={{ color: '#10b981', weight: 4, opacity: 0.85, dashArray: '6, 6' }}
          />

          {/* Rafiq Route (Cyan) */}
          <Polyline
            positions={rafiqRouteCoords}
            pathOptions={{ color: '#06b6d4', weight: 4, opacity: 0.85, dashArray: '6, 6' }}
          />

          {/* Shared Arterial Connector (Purple) */}
          <Polyline
            positions={sharedCorridorCoords}
            pathOptions={{ color: '#a855f7', weight: 3, opacity: 0.8, dashArray: '4, 4' }}
          />

          {/* Dhaka Zone Pins */}
          {DHAKA_MAP_ZONES.map((zone) => {
            const isSelected =
              zone.name.toLowerCase() === selectedPickup.toLowerCase() ||
              zone.name.toLowerCase() === selectedDestination.toLowerCase();

            return (
              <Marker
                key={zone.id}
                position={[zone.lat, zone.lng]}
                icon={createCustomIcon(!!zone.isHub, isSelected)}
                eventHandlers={{
                  click: () => onSelectZone && onSelectZone(zone.name),
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-xs p-1">
                    <div className="font-bold text-slate-900 flex items-center space-x-1">
                      {zone.isHub && <span>⚡</span>}
                      <span>{zone.name}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{zone.description}</p>
                    <button
                      onClick={() => onSelectZone && onSelectZone(zone.name)}
                      className="mt-2 w-full text-center text-[10px] bg-emerald-600 text-white font-semibold py-1 px-2 rounded hover:bg-emerald-700 transition"
                    >
                      Set as Destination
                    </button>
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
