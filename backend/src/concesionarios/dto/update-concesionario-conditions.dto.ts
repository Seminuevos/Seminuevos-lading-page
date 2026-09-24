import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

const FEE_TYPES = ['percent', 'fixed'];

export class UpdateConcesionarioConditionsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  sale_commission_pct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rental_commission_pct?: number;

  @IsOptional()
  @IsIn(FEE_TYPES)
  reservation_fee_type?: 'percent' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservation_fee_value?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  insurance_fee_pct?: number;
}
