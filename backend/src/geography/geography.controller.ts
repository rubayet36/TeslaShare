import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { GeographyService, RouteCompatibilityResult } from './geography.service';
import { CheckCompatibilityDto } from './dto/compatibility.dto';
import { CalculateDistanceDto } from './dto/distance.dto';

@Controller('zones')
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get()
  getAllZones() {
    return {
      success: true,
      data: this.geographyService.getAllZones(),
    };
  }

  @Get(':name')
  getZone(@Param('name') name: string) {
    return {
      success: true,
      data: this.geographyService.getZone(name),
    };
  }

  @Post('distance')
  calculateDistance(@Body() dto: CalculateDistanceDto) {
    const distanceKm = this.geographyService.calculateDistanceKm(dto.fromZone, dto.toZone);
    const estimatedMinutes = this.geographyService.estimateDurationMinutes(distanceKm);
    return {
      success: true,
      data: {
        from: dto.fromZone,
        to: dto.toZone,
        distanceKm,
        estimatedMinutes,
      },
    };
  }

  @Post('compatibility')
  checkRouteCompatibility(@Body() dto: CheckCompatibilityDto): { success: boolean; data: RouteCompatibilityResult } {
    const result = this.geographyService.checkCompatibility(
      { pickup: dto.pickupA, destination: dto.destinationA },
      { pickup: dto.pickupB, destination: dto.destinationB },
    );
    return {
      success: true,
      data: result,
    };
  }
}
