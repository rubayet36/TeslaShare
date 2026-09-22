import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { GeographyModule } from './geography/geography.module';
import { FareModule } from './fare/fare.module';
import { PoolsModule } from './pools/pools.module';
import { RidesModule } from './rides/rides.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GeographyModule,
    FareModule,
    PoolsModule,
    RidesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

