import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('SiteSettingsService', () => {
  let service: SiteSettingsService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [SiteSettingsService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(SiteSettingsService);
  });

  it('findAll devuelve todas las filas, incluidas las que no son públicas', async () => {
    client.from.mockReturnValue(
      createQueryBuilderMock({ data: [{ key: 'hero_slides', value: [] }], error: null }),
    );
    const result = await service.findAll();
    expect(result).toHaveLength(1);
  });

  it('findAll lanza BadRequestException si supabase falla', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.findAll()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('upsertMany no llama a supabase si no hay entradas', async () => {
    await service.upsertMany({});
    expect(client.from).not.toHaveBeenCalled();
  });

  it('upsertMany convierte el objeto en filas {key, value} y hace upsert por key', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null });
    client.from.mockReturnValue(builder);

    await service.upsertMany({ whatsapp_number: '12345', hero_slides: [{ title: 'x' }] });

    const [rows, options] = (builder.upsert as jest.Mock).mock.calls[0];
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'whatsapp_number', value: '12345' }),
        expect.objectContaining({ key: 'hero_slides', value: [{ title: 'x' }] }),
      ]),
    );
    expect(options).toEqual({ onConflict: 'key' });
  });

  it('upsertMany lanza BadRequestException si supabase falla', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.upsertMany({ a: 1 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
