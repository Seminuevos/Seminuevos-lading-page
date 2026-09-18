import { PartialType } from '@nestjs/mapped-types';
import { CreateRentalVehicleDto } from './create-rental-vehicle.dto';

export class UpdateRentalVehicleDto extends PartialType(CreateRentalVehicleDto) {}
