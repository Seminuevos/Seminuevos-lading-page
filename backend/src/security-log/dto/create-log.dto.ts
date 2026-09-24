import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const SEVERITIES = ['info', 'warning', 'critical'];

export class CreateLogDto {
  @IsString()
  @MaxLength(100)
  event_type: string;

  @IsOptional()
  @IsIn(SEVERITIES)
  severity?: 'info' | 'warning' | 'critical';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
