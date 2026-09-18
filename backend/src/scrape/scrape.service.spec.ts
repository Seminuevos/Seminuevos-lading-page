import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { ScrapeService } from './scrape.service';

jest.mock('node-fetch', () => jest.fn());
const mockedFetch = fetch as unknown as jest.Mock;

describe('ScrapeService', () => {
  let service: ScrapeService;
  let config: Record<string, string | undefined>;

  beforeEach(async () => {
    config = { APIFY_API_KEY: undefined };
    const module = await Test.createTestingModule({
      providers: [ScrapeService, { provide: ConfigService, useValue: { get: (key: string) => config[key] } }],
    }).compile();

    service = module.get(ScrapeService);
    mockedFetch.mockReset();
  });

  describe('proxyImage', () => {
    it('rechaza objetivos que no empiezan con http', async () => {
      await expect(service.proxyImage('not-a-url')).rejects.toThrow('Invalid Target');
    });

    it('sirve la imagen directamente cuando el fetch directo funciona (sin necesitar ninguna key)', async () => {
      mockedFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      });

      const result = await service.proxyImage('https://example.com/a.png');
      expect(result.contentType).toBe('image/png');
      expect(mockedFetch).toHaveBeenCalledTimes(1);
    });

    it('sin APIFY_API_KEY configurado, lanza Blocked si el fetch directo falla', async () => {
      mockedFetch.mockRejectedValue(new Error('network fail'));
      await expect(service.proxyImage('https://example.com/a.png')).rejects.toThrow('Blocked');
    });
  });

  describe('scrapeUrl', () => {
    it('usa el parser genérico para una URL que no es IAAI/Copart y nunca reenvía una key', async () => {
      mockedFetch.mockResolvedValue({
        ok: true,
        text: async () => '<html><head><title>2020 Mazda 3</title></head></html>',
      });

      const result = await service.scrapeUrl('https://example.com/listing/1');

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('2020 Mazda 3');
      // Sin APIFY_API_KEY, el fetch de HTML no debe usar proxy/agent.
      const [, options] = mockedFetch.mock.calls[0];
      expect(options?.agent).toBeUndefined();
    });

    it('devuelve success:false con el mensaje de error si la página viene vacía', async () => {
      mockedFetch.mockResolvedValue({ ok: true, text: async () => '' });
      const result = await service.scrapeUrl('https://example.com/listing/2');
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Página vacía/);
    });
  });
});
