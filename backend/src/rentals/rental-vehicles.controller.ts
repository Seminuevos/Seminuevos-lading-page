import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RentalVehiclesService } from './rental-vehicles.service';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';

@Controller('api/rentals/vehicles')
@UseGuards(JwtAuthGuard)
export class RentalVehiclesController {
  constructor(private readonly rentalVehiclesService: RentalVehiclesService) {}

  @Get()
  findAll() {
    return this.rentalVehiclesService.findAllAdmin().then((data) => ({ data }));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rentalVehiclesService.findOne(id).then((data) => ({ data }));
  }

  @Post()
  create(@Body() dto: CreateRentalVehicleDto) {
    return this.rentalVehiclesService.create(dto).then((data) => ({ data }));
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRentalVehicleDto) {
    return this.rentalVehiclesService.update(id, dto).then((data) => ({ data }));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rentalVehiclesService.remove(id).then(() => ({ message: 'Vehículo de alquiler eliminado' }));
  }

  @Get(':id/price-rules')
  findPriceRules(@Param('id', ParseIntPipe) id: number) {
    return this.rentalVehiclesService.findPriceRules(id).then((data) => ({ data }));
  }

  @Post(':id/price-rules')
  createPriceRule(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePriceRuleDto) {
    return this.rentalVehiclesService.createPriceRule(id, dto).then((data) => ({ data }));
  }

  @Delete(':id/price-rules/:ruleId')
  removePriceRule(@Param('id', ParseIntPipe) id: number, @Param('ruleId', ParseIntPipe) ruleId: number) {
    return this.rentalVehiclesService
      .removePriceRule(id, ruleId)
      .then(() => ({ message: 'Tarifa eliminada' }));
  }
}
