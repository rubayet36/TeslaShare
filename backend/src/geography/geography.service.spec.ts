import { Test, TestingModule } from '@nestjs/testing';
import { GeographyService } from './geography.service';
import { DHAKA_ZONES } from './dhaka-zones.data';

describe('GeographyService', () => {
  let service: GeographyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeographyService],
    }).compile();

    service = module.get<GeographyService>(GeographyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load all predefined Dhaka zones including Banani, Mohakhali, and Gulshan 1', () => {
    const zones = service.getAllZones();
    expect(zones.length).toBe(DHAKA_ZONES.length);
    expect(zones.some((z) => z.name === 'Banani')).toBe(true);
    expect(zones.some((z) => z.name === 'Mohakhali')).toBe(true);
    expect(zones.some((z) => z.name === 'Gulshan 1')).toBe(true);
  });

  it('should calculate realistic road distance between Banani and Mohakhali', () => {
    const distanceKm = service.calculateDistanceKm('Banani', 'Mohakhali');
    // Straight line is ~1.8km, with 1.35x road tortuosity factor, should be ~2.3 - 2.8 km
    expect(distanceKm).toBeGreaterThan(2.0);
    expect(distanceKm).toBeLessThan(3.5);
  });

  describe('PRD Section 1 Matching Scenario: Nusrat & Rafiq', () => {
    it('should determine that Nusrat (Banani -> Mohakhali) and Rafiq (Banani -> Gulshan 1) are compatible for pooling', () => {
      const nusratTrip = { pickup: 'Banani', destination: 'Mohakhali' };
      const rafiqTrip = { pickup: 'Banani', destination: 'Gulshan 1' };

      const result = service.checkCompatibility(nusratTrip, rafiqTrip);

      expect(result.isCompatible).toBe(true);
      expect(result.detourKm).toBeLessThanOrEqual(2.5);
      expect(result.recommendedOrder.length).toBe(3);
      expect(result.recommendedOrder[0]).toBe('Banani');
    });

    it('should determine that Nusrat and Shirin with identical routes (Banani -> Mohakhali) have 0% detour and are 100% compatible', () => {
      const nusratTrip = { pickup: 'Banani', destination: 'Mohakhali' };
      const shirinTrip = { pickup: 'Banani', destination: 'Mohakhali' };

      const result = service.checkCompatibility(nusratTrip, shirinTrip);

      expect(result.isCompatible).toBe(true);
      expect(result.detourPercentage).toBe(0);
      expect(result.detourKm).toBe(0);
    });

    it('should reject pooling for completely incompatible pickup zones (e.g. Uttara vs Dhanmondi)', () => {
      const tripUttara = { pickup: 'Uttara', destination: 'Farmgate' };
      const tripDhanmondi = { pickup: 'Dhanmondi', destination: 'Mohakhali' };

      const result = service.checkCompatibility(tripUttara, tripDhanmondi);

      expect(result.isCompatible).toBe(false);
      expect(result.reason).toContain('too far apart');
    });
  });
});
