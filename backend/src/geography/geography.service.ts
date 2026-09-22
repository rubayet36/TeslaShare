import { Injectable, BadRequestException } from '@nestjs/common';
import { DHAKA_ZONES, DhakaZone } from './dhaka-zones.data';

export interface RouteCompatibilityResult {
  isCompatible: boolean;
  reason: string;
  detourKm: number;
  detourPercentage: number;
  recommendedOrder: string[];
  combinedDistanceKm: number;
}

@Injectable()
export class GeographyService {
  private readonly zones: Map<string, DhakaZone> = new Map();
  // Dhaka street routing tortuosity factor: real road distance is ~1.35x straight line
  private readonly ROAD_TORTUOSITY_FACTOR = 1.35;
  // Maximum allowed detour percentage for pooling (e.g. 45% extra distance)
  private readonly MAX_DETOUR_PERCENTAGE = 45;

  constructor() {
    DHAKA_ZONES.forEach((zone) => {
      this.zones.set(zone.name.toLowerCase(), zone);
      this.zones.set(zone.id.toLowerCase(), zone);
    });
  }

  /**
   * Returns all supported Dhaka zones
   */
  getAllZones(): DhakaZone[] {
    return DHAKA_ZONES;
  }

  /**
   * Looks up a zone by name or ID
   */
  getZone(identifier: string): DhakaZone {
    const zone = this.zones.get(identifier.trim().toLowerCase());
    if (!zone) {
      throw new BadRequestException(`Zone '${identifier}' is not recognized in the Dhaka Tesla network.`);
    }
    return zone;
  }

  /**
   * Calculates estimated road distance between two Dhaka zones in Kilometers
   */
  calculateDistanceKm(fromZoneName: string, toZoneName: string): number {
    if (fromZoneName.toLowerCase() === toZoneName.toLowerCase()) {
      return 0.5; // Minimum intra-zone distance (500m)
    }

    const from = this.getZone(fromZoneName);
    const to = this.getZone(toZoneName);

    const straightLineKm = this.haversineDistance(from.lat, from.lng, to.lat, to.lng);
    const estimatedRoadKm = Math.round(straightLineKm * this.ROAD_TORTUOSITY_FACTOR * 10) / 10;
    return Math.max(estimatedRoadKm, 0.8);
  }

  /**
   * Estimates travel duration in minutes based on Dhaka average rush-hour speed (~14 km/h)
   */
  estimateDurationMinutes(distanceKm: number): number {
    const DHAKA_AVERAGE_SPEED_KMH = 14;
    const baseMinutes = (distanceKm / DHAKA_AVERAGE_SPEED_KMH) * 60;
    // Add 3 minutes buffer for traffic signals / intersections
    return Math.max(Math.round(baseMinutes + 3), 5);
  }

  /**
   * Core pooling compatibility engine:
   * Determines if Trip A and Trip B can share a Tesla (Section 4 matching rule).
   * Example: Nusrat (Banani -> Mohakhali) and Rafiq (Banani -> Gulshan 1)
   */
  checkCompatibility(
    tripA: { pickup: string; destination: string },
    tripB: { pickup: string; destination: string },
  ): RouteCompatibilityResult {
    const pickupA = this.getZone(tripA.pickup);
    const destA = this.getZone(tripA.destination);
    const pickupB = this.getZone(tripB.pickup);
    const destB = this.getZone(tripB.destination);

    const distA = this.calculateDistanceKm(pickupA.name, destA.name);
    const distB = this.calculateDistanceKm(pickupB.name, destB.name);

    // Rule 1: Pickup proximity check
    const pickupDistance =
      pickupA.name.toLowerCase() === pickupB.name.toLowerCase()
        ? 0
        : this.calculateDistanceKm(pickupA.name, pickupB.name);

    if (pickupDistance > 2.0) {
      return {
        isCompatible: false,
        reason: `Pickups (${pickupA.name} and ${pickupB.name}) are too far apart (${pickupDistance} km) for an efficient pool pickup.`,
        detourKm: 0,
        detourPercentage: 100,
        recommendedOrder: [],
        combinedDistanceKm: distA + distB,
      };
    }

    // Rule 2: Same destination check (e.g. Nusrat & Shirin both going to Mohakhali)
    if (destA.name.toLowerCase() === destB.name.toLowerCase()) {
      const combined = Math.max(distA, distB);
      return {
        isCompatible: true,
        reason: `Identical destination (${destA.name}) with shared pickup corridor. Maximum pooling efficiency.`,
        detourKm: 0,
        detourPercentage: 0,
        recommendedOrder: [pickupA.name, destA.name],
        combinedDistanceKm: combined,
      };
    }

    // Rule 3: Shared corridor / Sequence evaluation
    const distBetweenDests = this.calculateDistanceKm(destA.name, destB.name);

    // Sequence 1: Pickup -> Dest A first -> Dest B
    // Passenger A detour = 0. Passenger B detour = (distA + distBetweenDests) - distB
    const totalDistSeq1 = distA + distBetweenDests;
    const detourSeq1 = Math.max(0, Math.round((totalDistSeq1 - distB) * 10) / 10);
    const detourPctSeq1 = Math.round((detourSeq1 / distB) * 100);

    // Sequence 2: Pickup -> Dest B first -> Dest A
    // Passenger B detour = 0. Passenger A detour = (distB + distBetweenDests) - distA
    const totalDistSeq2 = distB + distBetweenDests;
    const detourSeq2 = Math.max(0, Math.round((totalDistSeq2 - distA) * 10) / 10);
    const detourPctSeq2 = Math.round((detourSeq2 / distA) * 100);

    const [bestTotal, bestDetourKm, bestDetourPct, bestOrder] =
      detourPctSeq1 <= detourPctSeq2
        ? [totalDistSeq1, detourSeq1, detourPctSeq1, [pickupA.name, destA.name, destB.name]]
        : [totalDistSeq2, detourSeq2, detourPctSeq2, [pickupB.name, destB.name, destA.name]];

    // Trip is compatible if passenger detour is <= 65% or <= 2.5 km (standard urban pooling tolerance)
    const isCompatible = bestDetourPct <= 65 || bestDetourKm <= 2.5;

    return {
      isCompatible,
      reason: isCompatible
        ? `Compatible route with only ${bestDetourPct}% detour (${bestDetourKm} km) for the later drop-off. Saves ${Math.round((distA + distB - bestTotal) * 10) / 10} km of Dhaka road congestion!`
        : `Detour of ${bestDetourPct}% (${bestDetourKm} km) exceeds acceptable pooling tolerance.`,
      detourKm: bestDetourKm,
      detourPercentage: bestDetourPct,
      recommendedOrder: bestOrder,
      combinedDistanceKm: Math.round(bestTotal * 10) / 10,
    };
  }


  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
