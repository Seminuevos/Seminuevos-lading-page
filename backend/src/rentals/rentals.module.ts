import { Module } from '@nestjs/common';
import { RentalVehiclesController } from './rental-vehicles.controller';
import { RentalVehiclesService } from './rental-vehicles.service';
import { RentalCustomersService } from './rental-customers.service';
import { RentalRequestsController } from './rental-requests.controller';
import { RentalRequestsService } from './rental-requests.service';
import { RentalsPublicController } from './rentals-public.controller';

@Module({
  controllers: [RentalVehiclesController, RentalRequestsController, RentalsPublicController],
  providers: [RentalVehiclesService, RentalCustomersService, RentalRequestsService],
})
export class RentalsModule {}
