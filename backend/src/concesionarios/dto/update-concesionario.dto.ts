import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateConcesionarioDto } from './create-concesionario.dto';

// `password` no se edita acá — tiene su propio endpoint dedicado
// (PUT /api/concesionarios/:id/password) porque toca agency_users, no
// concesionarios, y queremos que sea una acción explícita separada de
// "editar el perfil del concesionario".
export class UpdateConcesionarioDto extends PartialType(OmitType(CreateConcesionarioDto, ['password'] as const)) {}
