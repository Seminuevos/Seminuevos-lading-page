import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { VehicleInquiriesService } from './vehicle-inquiries.service';
import { CreateVehicleInquiryDto } from './dto/create-vehicle-inquiry.dto';

@Controller('api/vehicle-inquiries')
export class VehicleInquiriesController {
  constructor(private readonly vehicleInquiriesService: VehicleInquiriesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.vehicleInquiriesService.findAll(user).then((data) => ({ data }));
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  create(@Body() dto: CreateVehicleInquiryDto) {
    return this.vehicleInquiriesService
      .create(dto)
      .then((data) => ({ data, message: 'Consulta enviada correctamente' }));
  }
}
