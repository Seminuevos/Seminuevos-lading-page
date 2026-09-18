import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

const TABLE = 'inquiries';

@Injectable()
export class InquiriesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(limit = 200) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BadRequestException('Error al obtener consultas');
    }
    return data ?? [];
  }

  async create(dto: CreateInquiryDto, ip: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .insert([
        {
          full_name: dto.full_name,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          message: dto.message,
          vehicle_id: dto.vehicle_id ?? null,
          source: dto.source ?? 'web',
          visitor_id: dto.visitor_id ?? null,
          ip_address: ip,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Error al enviar consulta');
    }
    return data;
  }
}
