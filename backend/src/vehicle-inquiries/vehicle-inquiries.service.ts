import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateVehicleInquiryDto } from './dto/create-vehicle-inquiry.dto';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

const TABLE = 'vehicle_inquiries';

@Injectable()
export class VehicleInquiriesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(dto: CreateVehicleInquiryDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .insert([
        {
          full_name: dto.full_name,
          phone: dto.phone,
          vehicle_id: dto.vehicle_id,
          inquiry_type: dto.inquiry_type,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Error al enviar la consulta');
    }
    return data;
  }

  async findAll(requester: AuthenticatedUser, limit = 200) {
    let query = this.supabase
      .getClient()
      .from(TABLE)
      .select('*, vehicles(id, title)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (requester.role === 'concesionario') {
      // Join embebido de Supabase-js para filtrar por el concesionario dueño
      // del vehículo consultado, ya que vehicle_inquiries no tiene su propio
      // concesionario_id.
      query = this.supabase
        .getClient()
        .from(TABLE)
        .select('*, vehicles!inner(id, title, concesionario_id)')
        .eq('vehicles.concesionario_id', requester.concesionario_id)
        .order('created_at', { ascending: false })
        .limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException('Error al obtener consultas de vehículos');
    }
    return data ?? [];
  }
}
