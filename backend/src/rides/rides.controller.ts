import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { RidesService } from './rides.service';
import { CreateRideRequestDto } from './dto/create-ride.dto';
import { UpdateRideStatusDto } from './dto/update-ride-status.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';

@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post('request')
  createRideRequest(@Body() dto: CreateRideRequestDto) {
    return this.ridesService.createRideRequest(dto);
  }

  @Patch(':id/status')
  updateRideStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRideStatusDto,
  ) {
    return this.ridesService.updateStatus(id, dto);
  }

  @Post(':id/cancel')
  cancelRide(
    @Param('id') id: string,
    @Body() dto: CancelRideDto,
  ) {
    return this.ridesService.cancelRide(id, dto);
  }

  @Get(':id')
  getRideById(@Param('id') id: string) {
    return this.ridesService.getRideById(id);
  }

  @Get('user/:userId')
  getUserRides(@Param('userId') userId: string) {
    return this.ridesService.getUserRides(userId);
  }
}
