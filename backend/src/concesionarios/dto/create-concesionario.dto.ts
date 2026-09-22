import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const STATUSES = ['active', 'inactive'];

export class CreateConcesionarioDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contact_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contact_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: 'active' | 'inactive';
}
