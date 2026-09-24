import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeConcesionarioPasswordDto {
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password: string;
}
