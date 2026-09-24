import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const STATUSES = ['active', 'inactive'];

export class CreateConcesionarioDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(150)
  contact_person: string;

  // También es el email de login del usuario 'concesionario' que se crea
  // junto con el concesionario — ver ConcesionariosService.create().
  @IsEmail()
  @MaxLength(254)
  contact_email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password: string;

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
