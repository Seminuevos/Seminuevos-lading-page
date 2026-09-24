import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

const TABLE = 'vehicles';

// Columnas seguras para exponer al público (catálogo). Nunca incluye
// `created_by` ni cualquier campo interno de administración.
const PUBLIC_COLUMNS =
  'id, title, price, year, km, engine, transmission, fuel, body_type, condition, ' +
  'availability, origin, color, badge, description, features, images, catalog, ' +
  'mastertech, views, created_at, trade_in_eligible, financing_eligible, has_title, ' +
  'available_for_rental, for_sale, for_import, concesionario_id, brand, model, doors, ' +
  'deposit_fee_type, deposit_fee_value';

function isConcesionario(user?: AuthenticatedUser): user is AuthenticatedUser {
  return !!user && user.role === 'concesionario';
}

@Injectable()
export class VehiclesService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Catálogo público: sin autenticación, sin exponer la URL/clave de Supabase
   * al navegador — el frontend consume esto en vez de hablar con Supabase
   * directamente.
   */
  async findPublic() {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select(PUBLIC_COLUMNS)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Error al obtener el catálogo');
    }
    return data ?? [];
  }

  async findOnePublic(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select(PUBLIC_COLUMNS)
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return data;
  }

  async findAll(requester?: AuthenticatedUser) {
    let query = this.supabase.getClient().from(TABLE).select('*').order('created_at', { ascending: false });

    if (isConcesionario(requester)) {
      query = query.eq('concesionario_id', requester.concesionario_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException('Error al obtener inventario');
    }
    return data ?? [];
  }

  async findOne(id: string, requester?: AuthenticatedUser) {
    let query = this.supabase.getClient().from(TABLE).select('*').eq('id', id);

    if (isConcesionario(requester)) {
      query = query.eq('concesionario_id', requester.concesionario_id);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return data;
  }

  async create(dto: CreateVehicleDto, user: AuthenticatedUser) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .insert([
        {
          ...dto,
          year: dto.year ?? new Date().getFullYear(),
          status: dto.status ?? 'active',
          created_by: user.email,
          // Un concesionario solo puede crear vehículos para sí mismo — se
          // ignora cualquier concesionario_id que venga en el DTO.
          ...(isConcesionario(user) ? { concesionario_id: user.concesionario_id } : {}),
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Error al crear vehículo');
    }
    return data;
  }

  async update(id: string, dto: UpdateVehicleDto, requester?: AuthenticatedUser) {
    let query = this.supabase
      .getClient()
      .from(TABLE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (isConcesionario(requester)) {
      query = query.eq('concesionario_id', requester.concesionario_id);
    }

    const { data, error } = await query.select().maybeSingle();

    if (error) {
      throw new BadRequestException('Error al actualizar vehículo');
    }
    if (!data) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return data;
  }

  async remove(id: string, requester?: AuthenticatedUser) {
    let query = this.supabase.getClient().from(TABLE).delete().eq('id', id);

    if (isConcesionario(requester)) {
      query = query.eq('concesionario_id', requester.concesionario_id);
    }

    // .delete() sin .select() no informa cuántas filas afectó: un WHERE que no
    // matchea nada (id inexistente, o de otro concesionario) igual devuelve
    // error: null. Pedimos las filas borradas para distinguir "borrado" de
    // "no encontrado" y no reportar éxito cuando en realidad no se borró nada.
    const { data, error } = await query.select();
    if (error) {
      throw new BadRequestException('Error al eliminar vehículo');
    }
    if (!data || data.length === 0) {
      throw new NotFoundException('Vehículo no encontrado');
    }
  }

  /**
   * Proxy de subida a Supabase Storage (bucket `vehicle-images`). El
   * frontend ya no habla con Storage directamente — sube el archivo aquí y
   * el backend lo sube con la service_role key, devolviendo la URL pública.
   */
  async uploadImage(file: { buffer: Buffer; mimetype: string; originalname: string }): Promise<string> {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const fileName = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await this.supabase
      .getClient()
      .storage.from('vehicle-images')
      .upload(fileName, file.buffer, { contentType: file.mimetype || 'image/jpeg' });

    if (error) {
      throw new BadRequestException('Error al subir la imagen');
    }

    const { data } = this.supabase.getClient().storage.from('vehicle-images').getPublicUrl(fileName);
    return data.publicUrl;
  }
}
