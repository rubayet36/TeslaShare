import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { FareController } from './fare.controller';
import { GeographyModule } from '../geography/geography.module';

@Module({
  imports: [GeographyModule],
  controllers: [FareController],
  providers: [FareService],
  exports: [FareService],
})
export class FareModule {}
