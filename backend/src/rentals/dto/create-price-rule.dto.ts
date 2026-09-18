import { IsDateString, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePriceRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  price_per_day: number;
}
