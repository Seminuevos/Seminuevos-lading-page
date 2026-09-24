import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateConcesionarioDto } from './dto/create-concesionario.dto';
import { UpdateConcesionarioDto } from './dto/update-concesionario.dto';

const TABLE = 'concesionarios';

@Injectable()
export class ConcesionariosService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException('Error al obtener concesionarios');
    }
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.getClient().from(TABLE).select('*').eq('id', id).maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Concesionario no encontrado');
    }
    return data;
  }

  async create(dto: CreateConcesionarioDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .insert([{ ...dto, status: dto.status ?? 'active' }])
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Error al crear concesionario');
    }
    return data;
  }

  async update(id: string, dto: UpdateConcesionarioDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
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
}
