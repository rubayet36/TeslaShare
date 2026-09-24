'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { DHAKA_MAP_ZONES, MapZone } from '../lib/zones';
import { fetchPoolsApi } from '../lib/api';
import { fetchRoadRoute } from '../lib/osrm';
import { Route, Navigation, MapPin, Zap, ArrowRight, RefreshCw, Car, CheckCircle2 } from 'lucide-react';

interface DhakaMapProps {
  selectedPickup?: string;
  selectedDestination?: string;
  onSelectPickup?: (zoneName: string) => void;
  onSelectDestination?: (zoneName: string) => void;
}

// Subcomponent to capture clicks anywhere on the Leaflet map canvas
function MapCanvasClickHandler({ onCanvasClick }: { onCanvasClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onCanvasClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Helper to find the nearest Dhaka Zone to any clicked GPS point
function getNearestZone(lat: number, lng: number): MapZone {
  let closest = DHAKA_MAP_ZONES[0];
  let minDistance = Infinity;

  for (const zone of DHAKA_MAP_ZONES) {
    const d = Math.hypot(zone.lat - lat, zone.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      closest = zone;
    }
  }
  return closest;
}

export default function DhakaMap({
  selectedPickup = 'Banani',
  selectedDestination = 'Mohakhali',
  onSelectPickup,
  onSelectDestination,
}: DhakaMapProps) {
  const [mounted, setMounted] = useState(false);
  const [activePools, setActivePools] = useState<any[]>([]);
  // Current selection mode: 'pickup' or 'destination'
  const [activeMode, setActiveMode] = useState<'pickup' | 'destination'>('destination');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Road-accurate navigation coordinates along real Dhaka streets
  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  const pickupZone =
    DHAKA_MAP_ZONES.find((z) => z.name.toLowerCase() === selectedPickup.toLowerCase()) || DHAKA_MAP_ZONES[0];

  const destZone =
    DHAKA_MAP_ZONES.find((z) => z.name.toLowerCase() === selectedDestination.toLowerCase()) || DHAKA_MAP_ZONES[3];

  useEffect(() => {
    setMounted(true);

    // Poll active driver pools every 5s
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

  // Fetch real-world road geometry via OpenStreetMap OSRM whenever pickup or destination changes
  useEffect(() => {
    let isCancelled = false;
    async function loadRoadRoute() {
      setIsRoutingLoading(true);
      try {
        const route = await fetchRoadRoute(
          { lat: pickupZone.lat, lng: pickupZone.lng },
          { lat: destZone.lat, lng: destZone.lng },
        );
        if (!isCancelled) {
          setRoadCoordinates(route);
        }
      } catch {
        if (!isCancelled) {
          // Direct fallback line
          setRoadCoordinates([
            [pickupZone.lat, pickupZone.lng],
            [destZone.lat, destZone.lng],
          ]);
        }
      } finally {
        if (!isCancelled) {
          setIsRoutingLoading(false);
        }
      }
    }

    loadRoadRoute();
    return () => {
      isCancelled = true;
    };
  }, [pickupZone.name, destZone.name]);

  if (!mounted) {
    return (
      <div className="h-[460px] w-full rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
        Loading Dhaka Leaflet Map...
      </div>
    );
  }

  // Handle explicit selection of a zone
  const handleSelectPickup = (zoneName: string) => {
    if (onSelectPickup) onSelectPickup(zoneName);
    setStatusNotice(`📍 Pickup set to ${zoneName}! Now choose your Destination.`);
    setActiveMode('destination');
  };

  const handleSelectDestination = (zoneName: string) => {
    if (onSelectDestination) onSelectDestination(zoneName);
    setStatusNotice(`🎯 Destination set to ${zoneName}! Road route updated.`);
  };

  // When a zone marker is clicked on the map
  const handleZoneMarkerClick = (zoneName: string) => {
    if (activeMode === 'pickup') {
      handleSelectPickup(zoneName);
    } else {
      handleSelectDestination(zoneName);
    }
  };

  // When the user clicks anywhere on the map canvas
  const handleCanvasClick = (lat: number, lng: number) => {
    const nearest = getNearestZone(lat, lng);
    if (activeMode === 'pickup') {
      handleSelectPickup(nearest.name);
    } else {
      handleSelectDestination(nearest.name);
    }
  };

  const handleSwapRoute = () => {
    const prevPickup = selectedPickup;
    const prevDest = selectedDestination;
    if (onSelectPickup) onSelectPickup(prevDest);
    if (onSelectDestination) onSelectDestination(prevPickup);
    setStatusNotice(`🔁 Route swapped: ${prevDest} ➔ ${prevPickup}`);
  };

  // Custom styling for Zone Markers
  const createZoneIcon = (isHub: boolean, isPickup: boolean, isDest: boolean, zoneName: string) => {
    if (isPickup) {
      return L.divIcon({
        className: 'custom-leaflet-marker-pickup',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="absolute -top-1 w-9 h-9 rounded-full bg-emerald-500 animate-ping opacity-30"></div>
            <div class="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 border-2 border-white shadow-xl flex items-center justify-center font-bold text-sm scale-110 z-10">
              📍
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-emerald-950/90 text-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 shadow-md">
              PICKUP: ${zoneName}
            </div>
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 20],
      });
    }

    if (isDest) {
      return L.divIcon({
        className: 'custom-leaflet-marker-dest',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="absolute -top-1 w-9 h-9 rounded-full bg-cyan-400 animate-ping opacity-30"></div>
            <div class="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 border-2 border-white shadow-xl flex items-center justify-center font-bold text-sm scale-110 z-10">
              🎯
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap bg-cyan-950/90 text-cyan-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/40 shadow-md">
              DROP-OFF: ${zoneName}
            </div>
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 20],
      });
    }

    // Default clean landmark stop node (uncluttered)
    return L.divIcon({
      className: 'custom-leaflet-marker-node',
      html: `
        <div class="w-6 h-6 rounded-full bg-slate-900 border border-slate-600 shadow-md flex items-center justify-center hover:scale-125 hover:border-emerald-400 transition-all cursor-pointer">
          <span class="text-[10px] text-slate-300 font-bold">${isHub ? '⚡' : '•'}</span>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  // Custom Tesla Vehicle Marker Icon for active corridors
  const createTeslaVehicleIcon = (vehicleName: string, availableSeats: number) => {
    return L.divIcon({
      className: 'custom-tesla-marker',
      html: `
        <div class="px-2.5 py-1 rounded-full bg-slate-950 border-2 border-amber-400 shadow-2xl flex items-center space-x-1.5 text-white scale-105 animate-pulse">
          <span style="font-size: 13px;">🚗⚡</span>
          <span style="font-size: 10px; font-weight: bold; color: #fbbf24;">${availableSeats} seat${availableSeats > 1 ? 's' : ''}</span>
        </div>
      `,
      iconSize: [90, 30],
      iconAnchor: [45, 15],
    });
  };

  // Filter active pools that actually have passenger bookings
  const activeTeslaCorridors = activePools
    .filter(
      (p) =>
        (p.status === 'OPEN' || p.status === 'IN_PROGRESS') &&
        p.members &&
        p.members.length > 0,
    )
    .map((pool) => {
      const firstMember = pool.members[0].rideRequest;
      const originZone =
        DHAKA_MAP_ZONES.find(
          (z) => z.name.toLowerCase() === (firstMember?.pickupZone || '').toLowerCase(),
        ) || DHAKA_MAP_ZONES[0];

      const endZone =
        DHAKA_MAP_ZONES.find(
          (z) => z.name.toLowerCase() === (firstMember?.destinationZone || '').toLowerCase(),
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
      {/* Map Control Bar: Interactive Pickup & Destination Mode Selectors */}
      <div className="bg-slate-900/95 backdrop-blur-md p-3.5 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        {/* Toggle Mode Buttons: Clearly choose whether clicking sets Pickup or Drop-off */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setActiveMode('pickup');
              setStatusNotice('📍 Click any zone on the map to set your Pickup location.');
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl font-bold transition-all border cursor-pointer ${
              activeMode === 'pickup'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30 shadow-lg'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>1. Pickup:</span>
            <strong className="text-white">{pickupZone.name}</strong>
          </button>

          <button
            type="button"
            onClick={handleSwapRoute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-semibold border border-slate-700 cursor-pointer"
            title="Swap Pickup and Destination"
          >
            🔁
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('destination');
              setStatusNotice('🎯 Click any zone on the map to set your Drop-off destination.');
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl font-bold transition-all border cursor-pointer ${
              activeMode === 'destination'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-2 ring-cyan-500/30 shadow-lg'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>2. Drop-off:</span>
            <strong className="text-white">{destZone.name}</strong>
          </button>
        </div>

        {/* Real Road Route Navigation Badge */}
        <div className="flex items-center space-x-3 text-[11px] self-end sm:self-center">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
            <Route className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isRoutingLoading ? 'Calculating Road...' : '🛣️ Road Route (OpenStreetMap)'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-slate-400 hidden md:flex">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Pickup</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Drop-off</span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Status & Instruction Hint */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center space-x-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              activeMode === 'pickup' ? 'bg-emerald-400' : 'bg-cyan-400'
            } animate-ping`}
          />
          <span>
            {statusNotice || (
              <>
                Click any zone marker or point on the map to set{' '}
                <strong className={activeMode === 'pickup' ? 'text-emerald-400' : 'text-cyan-400'}>
                  {activeMode.toUpperCase()}
                </strong>
                !
              </>
            )}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 font-medium">
          Active Mode:{' '}
          <span
            className={`font-bold uppercase ${
              activeMode === 'pickup' ? 'text-emerald-400' : 'text-cyan-400'
            }`}
          >
            Setting {activeMode}
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[430px] w-full relative">
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

          {/* Map canvas click listener */}
          <MapCanvasClickHandler onCanvasClick={handleCanvasClick} />

          {/* ACTIVE TESLA POOL CORRIDORS (Amber line for live driver vehicles) */}
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
                  corridor.pool.vehicle?.name || 'Tesla',
                  corridor.pool.availableSeats ?? 1,
                )}
              >
                <Popup className="custom-popup">
                  <div className="text-xs p-1 min-w-[190px]">
                    <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span>🚗⚡</span>
                      <span>{corridor.pool.vehicle?.name || 'Tesla Fleet'}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Pilot: <strong>{corridor.pool.driver?.name || 'Active Driver'}</strong>
                    </p>
                    <div className="mt-1 text-[11px] text-amber-700 font-semibold">
                      Route: {corridor.originZone.name} ➔ {corridor.endZone.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Seats: {corridor.pool.availableSeats} of {corridor.pool.totalSeats} seats open
                    </div>

                    <button
                      onClick={() => {
                        handleSelectPickup(corridor.originZone.name);
                        handleSelectDestination(corridor.endZone.name);
                        setStatusNotice(
                          `⚡ Matched Tesla Route: ${corridor.originZone.name} ➔ ${corridor.endZone.name}!`,
                        );
                      }}
                      className="mt-2 w-full text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-1.5 px-2 rounded-lg transition shadow cursor-pointer"
                    >
                      ⚡ Match This Tesla Route
                    </button>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* ROAD-ACCURATE NAVIGATION POLYLINE (Strictly follows Dhaka streets) */}
          {roadCoordinates.length > 0 && (
            <>
              {/* Outer Road Casing (Dark contrast outline) */}
              <Polyline
                positions={roadCoordinates}
                pathOptions={{
                  color: '#022c22',
                  weight: 8,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Inner Glowing Electric Navigation Route */}
              <Polyline
                positions={roadCoordinates}
                pathOptions={{
                  color: '#10b981',
                  weight: 5,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          )}

          {/* Dhaka Zone Pins */}
          {DHAKA_MAP_ZONES.map((zone) => {
            const isPickup = zone.name.toLowerCase() === selectedPickup.toLowerCase();
            const isDest = zone.name.toLowerCase() === selectedDestination.toLowerCase();

            return (
              <Marker
                key={zone.id}
                position={[zone.lat, zone.lng]}
                icon={createZoneIcon(!!zone.isHub, isPickup, isDest, zone.name)}
                eventHandlers={{
                  click: () => handleZoneMarkerClick(zone.name),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
                  <span className="font-semibold text-xs">{zone.name}</span>
                </Tooltip>

                <Popup className="custom-popup">
                  <div className="text-xs p-1.5 min-w-[170px]">
                    <div className="font-bold text-slate-900 flex items-center space-x-1">
                      {zone.isHub && <span>⚡</span>}
                      <span>{zone.name}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{zone.description}</p>

                    <div className="mt-3 flex flex-col space-y-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPickup(zone.name);
                        }}
                        className={`w-full text-[10px] font-bold py-1.5 px-2 rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer ${
                          isPickup
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        <MapPin className="w-3 h-3" />
                        <span>📍 Set as Pickup (Start)</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDestination(zone.name);
                        }}
                        className={`w-full text-[10px] font-bold py-1.5 px-2 rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer ${
                          isDest
                            ? 'bg-cyan-600 text-white shadow'
                            : 'bg-cyan-500/10 text-cyan-800 border border-cyan-500/40 hover:bg-cyan-500 hover:text-white'
                        }`}
                      >
                        <Navigation className="w-3 h-3" />
                        <span>🎯 Set as Drop-off (End)</span>
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
