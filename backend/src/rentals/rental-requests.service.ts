import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { RentalCustomersService } from './rental-customers.service';
import { RentalVehiclesService } from './rental-vehicles.service';
import { CreateRentalRequestDto } from './dto/create-rental-request.dto';
import { UpdateRentalRequestDto } from './dto/update-rental-request.dto';
import { calculateRentalTotal } from './rental-pricing.util';

const TABLE = 'rental_requests';

@Injectable()
export class RentalRequestsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly customersService: RentalCustomersService,
    private readonly vehiclesService: RentalVehiclesService,
  ) {}

  /**
   * Crea una solicitud de alquiler. Si vehicle_ids trae más de un vehículo,
   * inserta una fila por vehículo (1 cliente -> N solicitudes), todas
   * compartiendo el mismo request_group_id para que el admin las vea
   * agrupadas como un solo checkout.
   */
  async create(dto: CreateRentalRequestDto) {
    if (new Date(dto.end_date) <= new Date(dto.start_date)) {
      throw new BadRequestException('end_date debe ser posterior a start_date');
    }

    const customer = await this.customersService.findOrCreate({
      email: dto.email,
      phone: dto.phone,
      full_name: dto.full_name,
    });

    const requestGroupId = randomUUID();
    const rows = [];

    for (const vehicleId of dto.vehicle_ids) {
      const vehicle = await this.vehiclesService.findOnePublic(vehicleId);
      const rules = await this.vehiclesService.findPriceRules(vehicleId);
      const { totalPrice } = calculateRentalTotal(
        dto.start_date,
        dto.end_date,
        vehicle.default_price_per_day,
        rules,
      );

      rows.push({
        request_group_id: requestGroupId,
        customer_id: customer.id,
        rental_vehicle_id: vehicleId,
        start_date: dto.start_date,
        end_date: dto.end_date,
        estimated_total: totalPrice,
        notes: dto.notes ?? null,
        status: 'pending',
      });
    }

    const { data, error } = await this.supabase.getClient().from(TABLE).insert(rows).select();

    if (error) throw new BadRequestException('Error al crear la solicitud de alquiler');
    return { request_group_id: requestGroupId, requests: data };
  }

  async findAllAdmin() {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .select('*, rental_customers(email, phone, full_name), rental_vehicles(title, year)')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Error al obtener solicitudes de alquiler');
    return data ?? [];
  }

  async updateStatus(id: number, dto: UpdateRentalRequestDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(TABLE)
      .update(dto)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new BadRequestException('Error al actualizar la solicitud');
    if (!data) throw new NotFoundException('Solicitud no encontrada');
    return data;
  }
}
