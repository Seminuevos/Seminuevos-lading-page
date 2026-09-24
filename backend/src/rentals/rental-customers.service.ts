import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

const TABLE = 'rental_customers';

export interface RentalCustomerInput {
  email: string;
  phone: string;
  full_name?: string;
}

export interface RentalCustomerRecord {
  id: string;
  email: string;
  phone: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class RentalCustomersService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * No hay cuenta/login para clientes de alquiler — el email es la única
   * identidad. Si ya existe, se actualiza teléfono/nombre si vinieron
   * distintos; si no, se crea.
   */
  async findOrCreate(input: RentalCustomerInput): Promise<RentalCustomerRecord> {
    const email = input.email.toLowerCase().trim();

    const { data: existing, error: findError } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .ilike('email', email)
      .maybeSingle();

    if (findError) throw new BadRequestException('Error al buscar cliente');

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (input.phone && input.phone !== existing.phone) updates.phone = input.phone;
      if (input.full_name && input.full_name !== existing.full_name) updates.full_name = input.full_name;

      if (Object.keys(updates).length === 0) {
        return existing;
      }

      const { data: updated, error: updateError } = await this.supabase
        .getClient()
        .from(TABLE)
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw new BadRequestException('Error al actualizar cliente');
      return updated;
    }

    const { data: created, error: createError } = await this.supabase
      .getClient()
      .from(TABLE)
      .insert([{ email, phone: input.phone, full_name: input.full_name ?? null }])
      .select()
      .single();

    if (createError) throw new BadRequestException('Error al crear cliente');
    return created;
  }
}
