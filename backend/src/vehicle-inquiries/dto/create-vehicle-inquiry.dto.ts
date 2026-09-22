import { IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

const INQUIRY_TYPES = ['alquiler', 'compra', 'importacion'];

export class CreateVehicleInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  full_name: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  phone: string;

  @IsInt()
  vehicle_id: number;

  @IsIn(INQUIRY_TYPES)
  inquiry_type: 'alquiler' | 'compra' | 'importacion';
}
