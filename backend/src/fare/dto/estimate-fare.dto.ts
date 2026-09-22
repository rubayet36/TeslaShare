import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class EstimateFareDto {
  @IsNotEmpty()
  @IsString()
  pickupZone: string;

  @IsNotEmpty()
  @IsString()
  destinationZone: string;

  @IsOptional()
  @IsBoolean()
  isPooled?: boolean = true;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3) // Bullet max capacity
  seats?: number = 1;
}
