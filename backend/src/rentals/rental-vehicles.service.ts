import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';
import { RentalPriceRule } from './rental-pricing.util';

const TABLE = 'rental_vehicles';
const RULES_TABLE = 'rental_price_rules';

@Injectable()
export class RentalVehiclesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAllAdmin() {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Error al obtener vehículos de alquiler');
    return data ?? [];
  }

  async findAllPublic() {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Error al obtener el catálogo de alquiler');
    return data ?? [];
  }

  async findOne(id: number) {
    const { data, error } = await this.supabase.getClient().from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error || !data) throw new NotFoundException('Vehículo de alquiler no encontrado');
    return data;
  }

  async findOnePublic(id: number) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('status', 'available')
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Vehículo de alquiler no encontrado');
    return data;
  }

  async create(dto: CreateRentalVehicleDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .insert([{ ...dto, status: dto.status ?? 'available' }])
      .select()
      .single();

    if (error) throw new BadRequestException('Error al crear vehículo de alquiler');
    return data;
  }

  async update(id: number, dto: UpdateRentalVehicleDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .update(dto)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException('Error al actualizar vehículo de alquiler');
    if (!data) throw new NotFoundException('Vehículo de alquiler no encontrado');
    return data;
  }

  async remove(id: number) {
    const { error } = await this.supabase.getClient().from(TABLE).delete().eq('id', id);
    if (error) throw new BadRequestException('Error al eliminar vehículo de alquiler');
  }

  async findPriceRules(vehicleId: number): Promise<RentalPriceRule[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from(RULES_TABLE)
      .select('*')
      .eq('rental_vehicle_id', vehicleId)
      .order('start_date', { ascending: true });

    if (error) throw new BadRequestException('Error al obtener las tarifas');
    return data ?? [];
  }

  async createPriceRule(vehicleId: number, dto: CreatePriceRuleDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(RULES_TABLE)
      .insert([{ ...dto, rental_vehicle_id: vehicleId }])
      .select()
      .single();

    if (error) throw new BadRequestException('Error al crear la tarifa');
    return data;
  }

  async removePriceRule(vehicleId: number, ruleId: number) {
    const { error } = await this.supabase
      .getClient()
      .from(RULES_TABLE)
      .delete()
      .eq('id', ruleId)
      .eq('rental_vehicle_id', vehicleId);

    if (error) throw new BadRequestException('Error al eliminar la tarifa');
  }
}
