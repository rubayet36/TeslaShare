import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePoolDto {
  @IsNotEmpty()
  @IsString()
  driverId: string;

  @IsNotEmpty()
  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  pickupZone?: string = 'Banani';
}
