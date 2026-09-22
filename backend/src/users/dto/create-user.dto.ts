import { IsEmail, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AgencyRole } from '../../auth/interfaces/jwt-payload.interface';

const ROLES: AgencyRole[] = ['admin', 'super_admin', 'sales', 'credit', 'mechanic', 'concesionario'];

export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  full_name: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: AgencyRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branch?: string;

  @IsOptional()
  @IsInt()
  concesionario_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
