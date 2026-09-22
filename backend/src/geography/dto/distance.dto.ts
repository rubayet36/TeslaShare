import { IsNotEmpty, IsString } from 'class-validator';

export class CalculateDistanceDto {
  @IsNotEmpty()
  @IsString()
  fromZone: string;

  @IsNotEmpty()
  @IsString()
  toZone: string;
}
