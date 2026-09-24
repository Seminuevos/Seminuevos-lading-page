import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendEmailDto } from './dto/send-email.dto';

/**
 * Reemplaza a api/send-email.js. La diferencia crítica: la API key de Resend
 * ya NUNCA viaja en el body de la request (antes el cliente la mandaba,
 * sacándola de site_settings, que era de lectura pública). Ahora vive
 * exclusivamente en la variable de entorno del backend.
 */
@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async send(dto: SendEmailDto): Promise<{ id?: string }> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('RESEND_API_KEY no está configurado en el backend');
    }
    const from = this.config.get<string>('RESEND_FROM_EMAIL') ?? 'SemiNuevo Agency <onboarding@resend.dev>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: [dto.to], subject: dto.subject, text: dto.text }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new BadGatewayException(data?.message ?? 'Error al enviar el correo');
    }
    return data;
  }
}
