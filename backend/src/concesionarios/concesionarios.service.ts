import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateConcesionarioDto } from './dto/create-concesionario.dto';
import { UpdateConcesionarioDto } from './dto/update-concesionario.dto';
import { ChangeConcesionarioPasswordDto } from './dto/change-concesionario-password.dto';
import { UpdateConcesionarioConditionsDto } from './dto/update-concesionario-conditions.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

const TABLE = 'concesionarios';
const USERS_TABLE = 'agency_users';
const CONDITIONS_TABLE = 'concesionario_conditions';
const BCRYPT_ROUNDS = 12;

// Columnas de agency_users seguras para devolver junto al concesionario
// (sin password_hash) — solo se piden para admin/super_admin (ver
// isAdmin()), porque el email/estado del usuario de login no debería
// filtrarse a sales/credit/mechanic, que también pueden listar
// concesionarios (lo usan para el selector "Concesionario dueño" del
// formulario de vehículos).
const USER_EMBED = 'agency_users(id, email, full_name, status)';

function isAdmin(user?: AuthenticatedUser): boolean {
  return !!user && (user.role === 'admin' || user.role === 'super_admin');
}

@Injectable()
export class ConcesionariosService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(requester?: AuthenticatedUser) {
    const select = isAdmin(requester) ? `*, ${USER_EMBED}` : '*';
    const { data, error } = await this.supabase.getClient().from(TABLE).select(select).order('name', { ascending: true });

    if (error) {
      throw new BadRequestException('Error al obtener concesionarios');
    }
    return data ?? [];
  }

  async findOne(id: string, requester?: AuthenticatedUser) {
    const select = isAdmin(requester) ? `*, ${USER_EMBED}` : '*';
    const { data, error } = await this.supabase.getClient().from(TABLE).select(select).eq('id', id).maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Concesionario no encontrado');
    }
    return data;
  }

  /**
   * Crea el concesionario Y su usuario de login (role='concesionario') en un
   * solo paso — la UI del panel solo tiene un formulario para esto. Supabase
   * (PostgREST) no da transacciones multi-tabla desde el cliente JS, así que
   * si falla la creación del usuario (ej. email duplicado) se borra el
   * concesionario recién creado para no dejar un registro huérfano.
   */
  async create(dto: CreateConcesionarioDto) {
    const email = dto.contact_email.toLowerCase().trim();

    const { data: existingUser } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .select('id')
      .ilike('email', email)
      .maybeSingle();
    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con este correo electrónico');
    }

    const { data: concesionario, error: concErr } = await this.supabase
      .getClient()
      .from(TABLE)
      .insert([
        {
          name: dto.name,
          contact_person: dto.contact_person,
          contact_email: email,
          contact_phone: dto.contact_phone ?? null,
          address: dto.address ?? null,
          status: dto.status ?? 'active',
        },
      ])
      .select()
      .single();

    if (concErr || !concesionario) {
      throw new BadRequestException('Error al crear concesionario');
    }

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const { error: userErr } = await this.supabase.getClient().from(USERS_TABLE).insert([
      {
        email,
        full_name: dto.contact_person,
        password_hash,
        phone: dto.contact_phone ?? null,
        role: 'concesionario',
        concesionario_id: concesionario.id,
        status: 'active',
      },
    ]);

    if (userErr) {
      await this.supabase.getClient().from(TABLE).delete().eq('id', concesionario.id);
      throw new BadRequestException('Error al crear el usuario del concesionario');
    }

    // create() ya es admin-only (guard a nivel de ruta), así que siempre
    // devolvemos el embed del usuario recién creado.
    const { data: created } = await this.supabase
      .getClient()
      .from(TABLE)
      .select(`*, ${USER_EMBED}`)
      .eq('id', concesionario.id)
      .maybeSingle();
    return created ?? concesionario;
  }

  async update(id: string, dto: UpdateConcesionarioDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, ${USER_EMBED}`)
      .maybeSingle();

    if (error) {
      throw new BadRequestException('Error al actualizar concesionario');
    }
    if (!data) {
      throw new NotFoundException('Concesionario no encontrado');
    }
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.getClient().from(TABLE).delete().eq('id', id);
    if (error) {
      throw new BadRequestException('Error al eliminar concesionario');
    }
  }

  /**
   * Cambia la contraseña del usuario de login asociado a este concesionario.
   * No requiere saber el id del agency_users — lo busca por concesionario_id.
   */
  async changePassword(id: string, dto: ChangeConcesionarioPasswordDto) {
    const { data: user } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .select('id')
      .eq('concesionario_id', id)
      .eq('role', 'concesionario')
      .maybeSingle();

    if (!user) {
      throw new NotFoundException('Este concesionario no tiene un usuario de login asociado');
    }

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const { error } = await this.supabase
      .getClient()
      .from(USERS_TABLE)
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      throw new BadRequestException('Error al cambiar la contraseña');
    }
  }

  async getConditions(id: string) {
    await this.findOne(id); // 404 si el concesionario no existe

    const { data, error } = await this.supabase
      .getClient()
      .from(CONDITIONS_TABLE)
      .select('*')
      .eq('concesionario_id', id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException('Error al obtener las condiciones del concesionario');
    }
    // Sin condiciones cargadas todavía — no es un error, se devuelve vacío.
    return (
      data ?? {
        concesionario_id: Number(id),
        sale_commission_pct: null,
        rental_commission_pct: null,
        reservation_fee_type: null,
        reservation_fee_value: null,
        insurance_fee_pct: null,
      }
    );
  }

  async upsertConditions(id: string, dto: UpdateConcesionarioConditionsDto) {
    await this.findOne(id); // 404 si el concesionario no existe

    const { data, error } = await this.supabase
      .getClient()
      .from(CONDITIONS_TABLE)
      .upsert([{ concesionario_id: Number(id), ...dto, updated_at: new Date().toISOString() }], {
        onConflict: 'concesionario_id',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Error al guardar las condiciones del concesionario');
    }
    return data;
  }
}
