import { IsIP, IsOptional, IsString, MaxLength } from 'class-validator';

export class BlockIpDto {
  @IsIP()
  ip: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;

  @IsOptional()
  @IsString()
  expires_at?: string;
}
