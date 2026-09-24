import { SetMetadata } from '@nestjs/common';
import { AgencyRole } from '../interfaces/jwt-payload.interface';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AgencyRole[]) => SetMetadata(ROLES_KEY, roles);
