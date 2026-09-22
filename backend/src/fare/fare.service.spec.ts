import { Test, TestingModule } from '@nestjs/testing';
import { FareService } from './fare.service';
import { GeographyService } from '../geography/geography.service';

describe('FareService', () => {
  let service: FareService;
  let geographyService: GeographyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FareService, GeographyService],
    }).compile();

    service = module.get<FareService>(FareService);
    geographyService = module.get<GeographyService>(GeographyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('PRD Section 5 Hand-Calculated Fare Model', () => {
    it('should calculate Nusrat trip (Banani -> Mohakhali) with exact integer Poysha and 30% pool discount', () => {
      // Mock or use real 2.6km distance for Banani -> Mohakhali
      const result = service.calculateFareForDistance('Banani', 'Mohakhali', 2.6, true, 1);

      // Hand calculation:
      // Base: 3000 Poysha (30.00 BDT)
      // Distance charge: 2.6 * 1500 = 3900 Poysha (39.00 BDT)
      // Solo total: 3000 + 3900 = 6900 Poysha (69.00 BDT)
      // Pool discount (30%): 6900 * 0.30 = 2070 Poysha (20.70 BDT)
      // Final fare: 6900 - 2070 = 4830 Poysha (48.30 BDT)
      expect(result.baseFarePoysha).toBe(3000);
      expect(result.distanceChargePoysha).toBe(3900);
      expect(result.soloTotalPoysha).toBe(6900);
      expect(result.poolDiscountPoysha).toBe(2070);
      expect(result.finalFarePoysha).toBe(4830);

      // BDT decimal representations
      expect(result.baseFareBdt).toBe(30.0);
      expect(result.distanceChargeBdt).toBe(39.0);
      expect(result.poolDiscountBdt).toBe(20.7);
      expect(result.finalFareBdt).toBe(48.3);

      // Integer guarantee for currency
      expect(Number.isInteger(result.finalFarePoysha)).toBe(true);
    });

    it('should calculate Rafiq trip (Banani -> Gulshan 1) with exact integer Poysha and 30% pool discount', () => {
      // 2.8 km for Banani -> Gulshan 1
      const result = service.calculateFareForDistance('Banani', 'Gulshan 1', 2.8, true, 1);

      // Hand calculation:
      // Base: 3000 Poysha
      // Distance charge: 2.8 * 1500 = 4200 Poysha
      // Solo total: 3000 + 4200 = 7200 Poysha
      // Pool discount (30%): 7200 * 0.30 = 2160 Poysha
      // Final fare: 7200 - 2160 = 5040 Poysha (50.40 BDT)
      expect(result.baseFarePoysha).toBe(3000);
      expect(result.distanceChargePoysha).toBe(4200);
      expect(result.soloTotalPoysha).toBe(7200);
      expect(result.poolDiscountPoysha).toBe(2160);
      expect(result.finalFarePoysha).toBe(5040);
      expect(result.finalFareBdt).toBe(50.4);
    });

    it('should calculate solo fare correctly when isPooled is false (0 discount)', () => {
      const result = service.calculateFareForDistance('Banani', 'Mohakhali', 2.6, false, 1);

      expect(result.isPooled).toBe(false);
      expect(result.poolDiscountPoysha).toBe(0);
      expect(result.finalFarePoysha).toBe(6900); // 69.00 BDT
      expect(result.finalFareBdt).toBe(69.0);
    });

    it('should correctly scale fare when multiple seats are booked', () => {
      // 2 seats for Banani -> Mohakhali
      const result = service.calculateFareForDistance('Banani', 'Mohakhali', 2.6, true, 2);

      // Base: 3000 * 2 = 6000 Poysha
      // Distance: 3900 * 2 = 7800 Poysha
      // Total: 13800 Poysha
      // Discount (30%): 13800 * 0.3 = 4140 Poysha
      // Final: 9660 Poysha
      expect(result.baseFarePoysha).toBe(6000);
      expect(result.distanceChargePoysha).toBe(7800);
      expect(result.finalFarePoysha).toBe(9660);
      expect(result.finalFareBdt).toBe(96.6);
    });

    it('should integrate with GeographyService to calculate fare using real zone names', () => {
      const result = service.calculateFare('Banani', 'Mohakhali', true, 1);
      expect(result.distanceKm).toBeGreaterThan(2.0);
      expect(result.finalFarePoysha).toBeGreaterThan(4000);
      expect(result.handTestFormula).toContain('BDT');
    });
  });
});
