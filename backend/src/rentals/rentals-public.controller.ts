import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RentalVehiclesService } from './rental-vehicles.service';
import { RentalRequestsService } from './rental-requests.service';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';

/**
 * Catálogo de alquiler + creación de solicitudes, sin autenticación (el
 * cliente de alquiler no tiene cuenta — solo email/teléfono).
 */
@Controller('api/public/rentals')
export class RentalsPublicController {
  constructor(
    private readonly rentalVehiclesService: RentalVehiclesService,
    private readonly rentalRequestsService: RentalRequestsService,
  ) {}

  @Get('vehicles')
  findVehicles() {
    return this.rentalVehiclesService.findAllPublic().then((data) => ({ data }));
  }

  @Get('vehicles/:id')
  async findVehicle(@Param('id', ParseIntPipe) id: number) {
    const [vehicle, priceRules] = await Promise.all([
      this.rentalVehiclesService.findOnePublic(id),
      this.rentalVehiclesService.findPriceRules(id),
    ]);
    return { data: { ...vehicle, price_rules: priceRules } };
  }

  @Post('requests')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  createRequest(@Body() dto: CreateRentalRequestDto) {
    return this.rentalRequestsService.create(dto).then((data) => ({ data }));
  }
}
