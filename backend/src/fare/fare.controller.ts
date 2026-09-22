import { Controller, Post, Get, Body } from '@nestjs/common';
import { FareService } from './fare.service';
import { EstimateFareDto } from './dto/estimate-fare.dto';

@Controller('fares')
export class FareController {
  constructor(private readonly fareService: FareService) {}

  @Post('estimate')
  estimateFare(@Body() dto: EstimateFareDto) {
    const result = this.fareService.calculateFare(
      dto.pickupZone,
      dto.destinationZone,
      dto.isPooled ?? true,
      dto.seats ?? 1,
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * PRD Section 5 Hand-Test Verification Endpoint
   * Returns exact calculations for Nusrat and Rafiq so evaluators can inspect
   * and verify by hand.
   */
  @Get('demo-cast')
  getDemoCastFares() {
    const nusrat = this.fareService.calculateFare('Banani', 'Mohakhali', true, 1);
    const rafiq = this.fareService.calculateFare('Banani', 'Gulshan 1', true, 1);
    const shirin = this.fareService.calculateFare('Banani', 'Mohakhali', true, 1);

    return {
      success: true,
      data: {
        currency: 'Poysha (1 BDT = 100 Poysha)',
        baseFarePoysha: this.fareService.BASE_FARE_POYSHA,
        ratePerKmPoysha: this.fareService.RATE_PER_KM_POYSHA,
        poolDiscountPercent: this.fareService.POOL_DISCOUNT_PERCENT,
        cast: {
          nusrat: {
            passenger: 'Nusrat',
            route: 'Banani -> Mohakhali',
            ...nusrat,
          },
          rafiq: {
            passenger: 'Rafiq',
            route: 'Banani -> Gulshan 1',
            ...rafiq,
          },
          shirin: {
            passenger: 'Shirin (Last Seat)',
            route: 'Banani -> Mohakhali',
            ...shirin,
          },
        },
      },
    };
  }
}
