/**
 * Real-time Road Routing Engine for Dhaka Tesla Pool using OpenStreetMap / OSRM
 * Computes road-accurate navigation geometries following actual streets, flyovers, and turns.
 */

const routeCache = new Map<string, [number, number][]>();

export async function fetchRoadRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): Promise<[number, number][]> {
  const cacheKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const res = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]?.geometry?.coordinates) {
      // OSRM returns [longitude, latitude], Leaflet needs [latitude, longitude]
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng],
      );

      routeCache.set(cacheKey, coords);
      return coords;
    }
  } catch (err) {
    console.warn('Road route fetch fallback to interpolated waypoints:', err);
  }

  // Graceful fallback: return a 5-point interpolated road corridor
  const fallbackCoords: [number, number][] = [
    [origin.lat, origin.lng],
    [
      origin.lat * 0.75 + destination.lat * 0.25,
      origin.lng * 0.75 + destination.lng * 0.25,
    ],
    [
      (origin.lat + destination.lat) / 2,
      (origin.lng + destination.lng) / 2,
    ],
    [
      origin.lat * 0.25 + destination.lat * 0.75,
      origin.lng * 0.25 + destination.lng * 0.75,
    ],
    [destination.lat, destination.lng],
  ];

  return fallbackCoords;
}
