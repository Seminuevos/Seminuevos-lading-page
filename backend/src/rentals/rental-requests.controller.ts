import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RentalRequestsService } from './rental-requests.service';
import { UpdateRentalRequestDto } from './dto/update-rental-request.dto';

@Controller('api/rentals/requests')
@UseGuards(JwtAuthGuard)
export class RentalRequestsController {
  constructor(private readonly rentalRequestsService: RentalRequestsService) {}

  @Get()
  findAll() {
    return this.rentalRequestsService.findAllAdmin().then((data) => ({ data }));
  }

  @Put(':id')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRentalRequestDto) {
    return this.rentalRequestsService.updateStatus(id, dto).then((data) => ({ data }));
  }
}
