'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DHAKA_MAP_ZONES } from '../lib/zones';
import { fetchPoolsApi } from '../lib/api';
import { Route, Navigation, MapPin, Zap, ArrowRight, RefreshCw, Car } from 'lucide-react';

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
  const [activePools, setActivePools] = useState<any[]>([]);
  // Tracking click state: 'pickup' | 'destination'
  const [selectionTarget, setSelectionTarget] = useState<'pickup' | 'destination'>('pickup');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // Poll active pools every 5s so riders see real-time active Tesla vehicles on routes
    const loadPools = async () => {
      try {
        const pools = await fetchPoolsApi();
        setActivePools(pools || []);
      } catch {
        // Silent catch
      }
    };

    loadPools();
    const interval = setInterval(loadPools, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[440px] w-full rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
        Loading Dhaka Leaflet Map...
      </div>
    );
  }

  // Create custom marker icons
  const createZoneIcon = (isHub: boolean, isPickup: boolean, isDest: boolean) => {
    let bgClass = 'bg-slate-800 text-slate-200 border-slate-600 hover:scale-110';
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
        <div class="w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center transition-all ${bgClass} cursor-pointer">
          <span style="font-size: 14px; font-weight: bold;">${iconEmoji}</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Custom Tesla Vehicle Marker Icon
  const createTeslaVehicleIcon = (vehicleName: string, availableSeats: number) => {
    return L.divIcon({
      className: 'custom-tesla-marker',
      html: `
        <div class="px-2 py-1 rounded-full bg-slate-950 border-2 border-amber-400 shadow-2xl flex items-center space-x-1 text-white scale-110 animate-bounce">
          <span style="font-size: 13px;">🚗⚡</span>
          <span style="font-size: 10px; font-weight: bold; color: #fbbf24;">${availableSeats} seat${availableSeats > 1 ? 's' : ''}</span>
        </div>
      `,
      iconSize: [85, 30],
      iconAnchor: [42, 15],
    });
  };

  const pickupZone = DHAKA_MAP_ZONES.find(
    (z) => z.name.toLowerCase() === selectedPickup.toLowerCase(),
  ) || DHAKA_MAP_ZONES[0];

  const destZone = DHAKA_MAP_ZONES.find(
    (z) => z.name.toLowerCase() === selectedDestination.toLowerCase(),
  ) || DHAKA_MAP_ZONES[3];

  // Dynamic route polyline connecting current selected pickup to destination
  const activeRouteCoords: [number, number][] = [
    [pickupZone.lat, pickupZone.lng],
    [
      (pickupZone.lat + destZone.lat) / 2 + (destZone.lng > pickupZone.lng ? 0.003 : -0.003),
      (pickupZone.lng + destZone.lng) / 2 + (destZone.lat > pickupZone.lat ? -0.003 : 0.003),
    ],
    [destZone.lat, destZone.lng],
  ];

  // Direct click on map zone handler
  const handleZoneClick = (zoneName: string) => {
    if (selectionTarget === 'pickup') {
      if (onSelectPickup) onSelectPickup(zoneName);
      setSelectionTarget('destination');
      setStatusNotice(`📍 Pickup set to ${zoneName}. Now click destination zone on the map!`);
    } else {
      if (onSelectDestination) onSelectDestination(zoneName);
      setSelectionTarget('pickup');
      setStatusNotice(`🎯 Destination set to ${zoneName}. Route: ${selectedPickup} ➔ ${zoneName}.`);
    }
  };

  const handleSwapRoute = () => {
    const prevPickup = selectedPickup;
    const prevDest = selectedDestination;
    if (onSelectPickup) onSelectPickup(prevDest);
    if (onSelectDestination) onSelectDestination(prevPickup);
    setStatusNotice(`🔁 Route swapped: ${prevDest} ➔ ${prevPickup}`);
  };

  // Filter active pools with members or drivers
  const activeTeslaCorridors = activePools
    .filter((p) => p.status === 'OPEN' || p.status === 'IN_PROGRESS')
    .map((pool) => {
      const firstMember = pool.members?.[0]?.rideRequest;
      const originZone = DHAKA_MAP_ZONES.find(
        (z) => z.name.toLowerCase() === (firstMember?.pickupZone || pool.pickupZone || 'Banani').toLowerCase(),
      ) || DHAKA_MAP_ZONES[0];

      const endZone = DHAKA_MAP_ZONES.find(
        (z) => z.name.toLowerCase() === (firstMember?.destinationZone || 'Mohakhali').toLowerCase(),
      ) || DHAKA_MAP_ZONES[3];

      const midpointLat = (originZone.lat + endZone.lat) / 2;
      const midpointLng = (originZone.lng + endZone.lng) / 2;

      return {
        pool,
        originZone,
        endZone,
        midpoint: [midpointLat, midpointLng] as [number, number],
        corridorCoords: [
          [originZone.lat, originZone.lng],
          [endZone.lat, endZone.lng],
        ] as [number, number][],
      };
    });

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      {/* Map Header & Interactive Guide */}
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Route className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white">Your Selected Route:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center space-x-1.5">
            <span>{pickupZone.name}</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>{destZone.name}</span>
          </span>
          <button
            onClick={handleSwapRoute}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px] font-semibold border border-slate-700"
            title="Swap Pickup and Destination"
          >
            🔁 Swap
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Pickup</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300">Destination</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Tesla Pool (⚡)</span>
          </div>
        </div>
      </div>

      {/* Floating Click Instruction Notice */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>
            {statusNotice || (
              <>
                Click any zone marker on the map to set <strong>Pickup</strong>, then click another zone to set <strong>Destination</strong>!
              </>
            )}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
          Next click sets: <strong className="text-emerald-400 uppercase">{selectionTarget}</strong>
        </span>
      </div>

      {/* Map Container */}
      <div className="h-[430px] w-full">
        <MapContainer
          center={[pickupZone.lat, pickupZone.lng]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
        >
          {/* OpenStreetMap Global Map Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* ACTIVE TESLA CORRIDORS (Amber glowing polylines for active Tesla pools) */}
          {activeTeslaCorridors.map((corridor, idx) => (
            <React.Fragment key={corridor.pool.id || idx}>
              <Polyline
                positions={corridor.corridorCoords}
                pathOptions={{
                  color: '#fbbf24',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: '6, 8',
                }}
              />
              <Marker
                position={corridor.midpoint}
                icon={createTeslaVehicleIcon(
                  corridor.pool.vehicle?.name || 'Bullet',
                  corridor.pool.availableSeats ?? 1,
                )}
              >
                <Popup className="custom-popup">
                  <div className="text-xs p-1 min-w-[190px]">
                    <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span>🚗⚡</span>
                      <span>{corridor.pool.vehicle?.name || 'Tesla Bullet'}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Pilot: <strong>{corridor.pool.driver?.name || 'Jashim'}</strong>
                    </p>
                    <div className="mt-1 text-[11px] text-amber-700 font-semibold">
                      Route: {corridor.originZone.name} ➔ {corridor.endZone.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Seats: {corridor.pool.availableSeats} of {corridor.pool.totalSeats} seats open
                    </div>

                    <button
                      onClick={() => {
                        if (onSelectPickup) onSelectPickup(corridor.originZone.name);
                        if (onSelectDestination) onSelectDestination(corridor.endZone.name);
                        setStatusNotice(
                          `⚡ Matched Tesla Route: ${corridor.originZone.name} ➔ ${corridor.endZone.name}!`,
                        );
                      }}
                      className="mt-2 w-full text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-1.5 px-2 rounded-lg transition shadow"
                    >
                      ⚡ Match This Tesla Route
                    </button>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* DYNAMIC SELECTED TRIP POLYLINE (Vibrant Emerald Glow) */}
          <Polyline
            positions={activeRouteCoords}
            pathOptions={{
              color: '#10b981',
              weight: 5,
              opacity: 0.95,
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
                icon={createZoneIcon(!!zone.isHub, isPickup, isDest)}
                eventHandlers={{
                  click: () => handleZoneClick(zone.name),
                }}
              >
                <Popup className="custom-popup">
                  <div className="text-xs p-1 min-w-[160px]">
                    <div className="font-bold text-slate-900 flex items-center space-x-1">
                      {zone.isHub && <span>⚡</span>}
                      <span>{zone.name}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{zone.description}</p>

                    <div className="mt-2.5 flex space-x-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectPickup) onSelectPickup(zone.name);
                          setStatusNotice(`📍 Pickup set to ${zone.name}`);
                        }}
                        className={`flex-1 text-[10px] font-semibold py-1 px-1.5 rounded transition ${
                          isPickup
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-200 hover:bg-emerald-500 hover:text-white text-slate-800'
                        }`}
                      >
                        Set Pickup
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectDestination) onSelectDestination(zone.name);
                          setStatusNotice(`🎯 Destination set to ${zone.name}`);
                        }}
                        className={`flex-1 text-[10px] font-semibold py-1 px-1.5 rounded transition ${
                          isDest
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'bg-slate-200 hover:bg-cyan-500 hover:text-white text-slate-800'
                        }`}
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
