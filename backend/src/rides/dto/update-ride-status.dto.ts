import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RideStatus } from '@prisma/client';

export class UpdateRideStatusDto {
  @IsNotEmpty()
  @IsEnum(RideStatus)
  status: RideStatus;

  @IsOptional()
  @IsString()
  driverId?: string;
}
