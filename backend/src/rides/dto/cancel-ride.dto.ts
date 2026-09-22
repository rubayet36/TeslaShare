import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CancelRideDto {
  @IsNotEmpty()
  @IsString()
  userId: string; // Passenger or Driver initiating cancellation

  @IsOptional()
  @IsString()
  reason?: string = 'Passenger requested cancellation';
}
