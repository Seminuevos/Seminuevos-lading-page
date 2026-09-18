import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadGatewayException, InternalServerErrorException } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let config: Record<string, string | undefined>;

  beforeEach(async () => {
    config = { RESEND_API_KEY: 'test-key', RESEND_FROM_EMAIL: undefined };
    const module = await Test.createTestingModule({
      providers: [EmailService, { provide: ConfigService, useValue: { get: (key: string) => config[key] } }],
    }).compile();

    service = module.get(EmailService);
    global.fetch = jest.fn();
  });

  it('lanza un error si RESEND_API_KEY no está configurado (nunca acepta la key del cliente)', async () => {
    config.RESEND_API_KEY = undefined;
    await expect(service.send({ to: 'a@a.com', subject: 'Hola', text: 'Mensaje' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('envía el correo usando la API key del entorno, nunca la del request', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email-123' }),
    });

    const result = await service.send({ to: 'a@a.com', subject: 'Hola', text: 'Mensaje' });

    expect(result).toEqual({ id: 'email-123' });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-key');
  });

  it('propaga el error de Resend como BadGatewayException', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'invalid domain' }),
    });

    await expect(service.send({ to: 'a@a.com', subject: 'Hola', text: 'Mensaje' })).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
