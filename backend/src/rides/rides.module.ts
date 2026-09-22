import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { FareModule } from '../fare/fare.module';
import { GeographyModule } from '../geography/geography.module';
import { PoolsModule } from '../pools/pools.module';

@Module({
  imports: [FareModule, GeographyModule, PoolsModule],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
