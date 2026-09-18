import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackEventDto {
  @IsString()
  @MaxLength(50)
  event_type: string;

  @IsOptional()
  @IsObject()
  event_data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  visitor_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  url?: string;
}

export class ReportSecurityEventDto {
  @IsString()
  @MaxLength(100)
  event_type: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
