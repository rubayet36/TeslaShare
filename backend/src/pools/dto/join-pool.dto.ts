import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class JoinPoolDto {
  @IsNotEmpty()
  @IsString()
  rideRequestId: string;

  @IsNotEmpty()
  @IsString()
  poolId: string;

  @IsInt()
  @Min(1)
  @Max(3)
  seats: number = 1;
}
