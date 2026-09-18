import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const STATUSES = ['pending', 'contacted', 'confirmed', 'paid', 'completed', 'cancelled'];

export class UpdateRentalRequestDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admin_notes?: string;
}
