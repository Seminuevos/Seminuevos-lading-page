import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  agency_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp_number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp_number2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email_primary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(254)
  email_secondary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  business_hours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagram_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  facebook_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tiktok_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  logo_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  primary_color?: string;

  @IsOptional()
  @IsBoolean()
  financing_enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  max_financing_months?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  min_initial_payment_pct?: number;
}
