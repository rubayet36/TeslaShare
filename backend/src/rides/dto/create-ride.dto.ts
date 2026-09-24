import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateRideRequestDto {
  @IsNotEmpty()
  @IsString()
  passengerId: string;

  @IsNotEmpty()
  @IsString()
  pickupZone: string;

  @IsNotEmpty()
  @IsString()
  destinationZone: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  seatsRequested?: number = 1;

  @IsOptional()
  @IsBoolean()
  isPooled?: boolean = true;

  @IsOptional()
  @IsBoolean()
  autoMatch?: boolean = false;
}
