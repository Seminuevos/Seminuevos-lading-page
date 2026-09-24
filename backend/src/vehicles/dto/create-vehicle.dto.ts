import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const STATUSES = ['active', 'inactive', 'sold', 'reserved'];

export class CreateVehicleDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  price?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  km?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  engine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  transmission?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fuel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  body_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  condition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  availability?: string;

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
  @ArrayMaxSize(30)
  features?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  images?: string[];

  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  doors?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  badge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  catalog?: string;

  @IsOptional()
  @IsBoolean()
  mastertech?: boolean;

  @IsOptional()
  @IsBoolean()
  trade_in_eligible?: boolean;

  @IsOptional()
  @IsBoolean()
  financing_eligible?: boolean;

  @IsOptional()
  @IsBoolean()
  has_title?: boolean;

  @IsOptional()
  @IsBoolean()
  available_for_rental?: boolean;

  @IsOptional()
  @IsBoolean()
  for_sale?: boolean;

  @IsOptional()
  @IsBoolean()
  for_import?: boolean;

  @IsOptional()
  @IsInt()
  concesionario_id?: number;
}
