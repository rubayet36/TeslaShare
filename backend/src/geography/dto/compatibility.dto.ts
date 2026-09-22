import { IsNotEmpty, IsString } from 'class-validator';

export class CheckCompatibilityDto {
  @IsNotEmpty()
  @IsString()
  pickupA: string;

  @IsNotEmpty()
  @IsString()
  destinationA: string;

  @IsNotEmpty()
  @IsString()
  pickupB: string;

  @IsNotEmpty()
  @IsString()
  destinationB: string;
}
