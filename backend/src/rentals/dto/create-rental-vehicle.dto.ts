import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const STATUSES = ['available', 'unavailable', 'maintenance'];

export class CreateRentalVehicleDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  body_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  transmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fuel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  features?: string[];

  @IsNumber()
  @Min(0)
  default_price_per_day: number;

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;
}
