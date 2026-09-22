import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PoolsService } from './pools.service';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JoinPoolDto } from './dto/join-pool.dto';
import { PoolStatus } from '@prisma/client';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Post()
  createPool(@Body() dto: CreatePoolDto) {
    return this.poolsService.createPool(dto);
  }

  @Post('join')
  joinPool(@Body() dto: JoinPoolDto) {
    return this.poolsService.joinPoolAtomic(dto);
  }

  @Get()
  getAllPools(@Query('status') status?: PoolStatus) {
    return this.poolsService.getAllPools(status);
  }

  @Get('active')
  getActivePools(@Query('zone') zone?: string) {
    return this.poolsService.getActivePools(zone);
  }

  @Get(':id')
  getPoolById(@Param('id') id: string) {
    return this.poolsService.getPoolById(id);
  }
}
