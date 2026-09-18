import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDateString, IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRentalRequestDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  full_name?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  vehicle_ids: number[];

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
