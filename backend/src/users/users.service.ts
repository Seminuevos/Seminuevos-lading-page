import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AgencyUserRecord, SafeAgencyUser, toSafeUser } from './entities/agency-user.entity';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

const USERS_TABLE = 'agency_users';
const SAFE_COLUMNS =
  'id, email, full_name, phone, role, branch, concesionario_id, status, notes, created_at, updated_at';
const BCRYPT_ROUNDS = 12;

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'admin' || user.role === 'super_admin';
}

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  async findByEmail(email: string): Promise<AgencyUserRecord | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      throw new BadRequestException('Error al consultar el usuario');
    }
    return (data as AgencyUserRecord) ?? null;
  }

  async findAll(requester: AuthenticatedUser): Promise<SafeAgencyUser[]> {
    let query = this.supabase
      .getClient()
      .from(USERS_TABLE)
      .select(SAFE_COLUMNS)
      .order('created_at', { ascending: false });

    if (!isAdmin(requester)) {
      query = query.eq('id', requester.id);
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException('Error al obtener usuarios');
    }
    return (data ?? []) as unknown as SafeAgencyUser[];
  }

  async findOne(id: string, requester: AuthenticatedUser): Promise<SafeAgencyUser> {
    if (!isAdmin(requester) && requester.id !== id) {
      throw new ForbiddenException('Acceso denegado');
    }

    const { data, error } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .select(SAFE_COLUMNS)
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return data as unknown as SafeAgencyUser;
  }

  async create(dto: CreateUserDto): Promise<SafeAgencyUser> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con este correo electrónico');
    }

    const role = dto.role ?? 'sales';
    if (role === 'concesionario' && !dto.concesionario_id) {
      throw new BadRequestException('Un usuario concesionario requiere concesionario_id');
    }

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { data, error } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .insert([
        {
          email: dto.email.toLowerCase().trim(),
          full_name: dto.full_name,
          password_hash,
          phone: dto.phone ?? null,
          role,
          branch: dto.branch ?? 'Porlamar (Sede Principal)',
          concesionario_id: role === 'concesionario' ? dto.concesionario_id : null,
          status: 'active',
          notes: dto.notes ?? null,
        },
      ])
      .select(SAFE_COLUMNS)
      .single();

    if (error || !data) {
      throw new BadRequestException('Error al crear usuario');
    }
    return data as unknown as SafeAgencyUser;
  }

  async update(id: string, dto: UpdateUserDto, requester: AuthenticatedUser): Promise<SafeAgencyUser> {
    const admin = isAdmin(requester);
    const isSelf = requester.id === id;

    if (!admin && !isSelf) {
      throw new ForbiddenException('Acceso denegado');
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (dto.full_name !== undefined) payload.full_name = dto.full_name;
    if (dto.phone !== undefined) payload.phone = dto.phone;
    if (dto.branch !== undefined) payload.branch = dto.branch;
    if (dto.notes !== undefined) payload.notes = dto.notes;

    if (admin) {
      if (dto.role !== undefined) payload.role = dto.role;
      if (dto.status !== undefined) payload.status = dto.status;
      if (dto.email !== undefined) payload.email = dto.email.toLowerCase().trim();
      if (dto.concesionario_id !== undefined) payload.concesionario_id = dto.concesionario_id;

      const nextRole = (dto.role ?? undefined) as string | undefined;
      const nextConcesionarioId =
        dto.concesionario_id !== undefined ? dto.concesionario_id : undefined;
      if (nextRole === 'concesionario' && nextConcesionarioId === null) {
        throw new BadRequestException('Un usuario concesionario requiere concesionario_id');
      }
    }

    if (dto.password) {
      payload.password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const { data, error } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .update(payload)
      .eq('id', id)
      .select(SAFE_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new BadRequestException('Error al actualizar usuario');
    }
    if (!data) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return data as unknown as SafeAgencyUser;
  }

  async remove(id: string, requester: AuthenticatedUser): Promise<void> {
    if (!isAdmin(requester)) {
      throw new ForbiddenException('Solo los administradores pueden eliminar usuarios');
    }
    if (requester.id === id) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    const { data: admins, error: countError } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .select('id')
      .in('role', ['admin', 'super_admin']);

    if (countError) {
      throw new BadRequestException('Error al validar administradores restantes');
    }
    if ((admins ?? []).length <= 1 && (admins ?? []).some((a) => a.id === id)) {
      throw new BadRequestException('No es posible eliminar al último administrador del sistema');
    }

    const { error } = await this.supabase.getClient().from(USERS_TABLE).delete().eq('id', id);
    if (error) {
      throw new BadRequestException('Error al eliminar usuario');
    }
  }
}
