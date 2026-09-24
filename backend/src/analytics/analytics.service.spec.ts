import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from '../supabase/supabase.service';
import { createQueryBuilderMock, createSupabaseClientMock } from '../test-utils/supabase-mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(async () => {
    client = createSupabaseClientMock();
    const module = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: SupabaseService, useValue: { getClient: () => client } }],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('findRecent devuelve los eventos de analytics', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: [{ id: 1 }], error: null }));
    await expect(service.findRecent()).resolves.toHaveLength(1);
  });

  it('findRecent lanza BadRequestException si supabase falla', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.findRecent()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findLeads devuelve los leads del CRM', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: [{ visitor_id: 'v1' }], error: null }));
    await expect(service.findLeads()).resolves.toHaveLength(1);
  });

  it('findLeads lanza BadRequestException si supabase falla', async () => {
    client.from.mockReturnValue(createQueryBuilderMock({ data: null, error: { message: 'boom' } }));
    await expect(service.findLeads()).rejects.toBeInstanceOf(BadRequestException);
  });
});
