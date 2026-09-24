import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ScrapeRequestDto {
  @IsUrl({ require_tld: false })
  @MaxLength(2000)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  html?: string;

  @IsOptional()
  @IsBoolean()
  trustHtml?: boolean;
}
