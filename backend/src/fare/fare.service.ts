import { Injectable } from '@nestjs/common';
import { GeographyService } from '../geography/geography.service';

export interface FareCalculationResult {
  pickupZone: string;
  destinationZone: string;
  distanceKm: number;
  seats: number;
  isPooled: boolean;
  baseFarePoysha: number;
  distanceChargePoysha: number;
  soloTotalPoysha: number;
  poolDiscountPoysha: number;
  finalFarePoysha: number;
  // BDT Display formatted values (1 BDT = 100 Poysha)
  baseFareBdt: number;
  distanceChargeBdt: number;
  soloTotalBdt: number;
  poolDiscountBdt: number;
  finalFareBdt: number;
  handTestFormula: string;
}

@Injectable()
export class FareService {
  // PRD Section 5: Hand-testable fare parameters (in Poysha)
  // 1 BDT = 100 Poysha
  readonly BASE_FARE_POYSHA = 3000; // 30.00 BDT base boarding fare
  readonly RATE_PER_KM_POYSHA = 1500; // 15.00 BDT per Km
  readonly POOL_DISCOUNT_PERCENT = 30; // 30% savings for sharing a Tesla

  constructor(private readonly geographyService: GeographyService) {}

  /**
   * Calculates individual passenger fare according to the PRD formula:
   * passengerFare = baseFare + distanceCharge - poolDiscount
   * Stored as integer Poysha to prevent floating point rounding inaccuracies.
   */
  calculateFare(
    pickupZone: string,
    destinationZone: string,
    isPooled = true,
    seats = 1,
  ): FareCalculationResult {
    const distanceKm = this.geographyService.calculateDistanceKm(pickupZone, destinationZone);
    return this.calculateFareForDistance(pickupZone, destinationZone, distanceKm, isPooled, seats);
  }

  calculateFareForDistance(
    pickupZone: string,
    destinationZone: string,
    distanceKm: number,
    isPooled = true,
    seats = 1,
  ): FareCalculationResult {
    // 1. Calculate base fare
    const baseFarePoysha = this.BASE_FARE_POYSHA * seats;

    // 2. Calculate distance charge (distance in km * rate per km)
    const distanceChargePoysha = Math.round(distanceKm * this.RATE_PER_KM_POYSHA * seats);

    // 3. Solo total before pool discount
    const soloTotalPoysha = baseFarePoysha + distanceChargePoysha;

    // 4. Calculate pool discount (30% off total if pooled)
    const poolDiscountPoysha = isPooled
      ? Math.round((soloTotalPoysha * this.POOL_DISCOUNT_PERCENT) / 100)
      : 0;

    // 5. Final passenger fare
    const finalFarePoysha = soloTotalPoysha - poolDiscountPoysha;

    const handTestFormula = isPooled
      ? `${this.poyshaToBdt(baseFarePoysha)} BDT (base) + ${this.poyshaToBdt(distanceChargePoysha)} BDT (${distanceKm}km × 15 BDT) - ${this.poyshaToBdt(poolDiscountPoysha)} BDT (30% pool discount) = ${this.poyshaToBdt(finalFarePoysha)} BDT`
      : `${this.poyshaToBdt(baseFarePoysha)} BDT (base) + ${this.poyshaToBdt(distanceChargePoysha)} BDT (${distanceKm}km × 15 BDT) = ${this.poyshaToBdt(finalFarePoysha)} BDT (Solo)`;

    return {
      pickupZone,
      destinationZone,
      distanceKm,
      seats,
      isPooled,
      baseFarePoysha,
      distanceChargePoysha,
      soloTotalPoysha,
      poolDiscountPoysha,
      finalFarePoysha,
      baseFareBdt: this.poyshaToBdt(baseFarePoysha),
      distanceChargeBdt: this.poyshaToBdt(distanceChargePoysha),
      soloTotalBdt: this.poyshaToBdt(soloTotalPoysha),
      poolDiscountBdt: this.poyshaToBdt(poolDiscountPoysha),
      finalFareBdt: this.poyshaToBdt(finalFarePoysha),
      handTestFormula,
    };
  }

  poyshaToBdt(poysha: number): number {
    return Math.round((poysha / 100) * 100) / 100;
  }

  bdtToPoysha(bdt: number): number {
    return Math.round(bdt * 100);
  }
}
