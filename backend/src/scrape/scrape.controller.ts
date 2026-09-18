import { BadRequestException, Body, Controller, Get, Header, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScrapeService } from './scrape.service';
import { ScrapeRequestDto } from './dto/scrape-request.dto';

@Controller('api/scrape')
export class ScrapeController {
  constructor(private readonly scrapeService: ScrapeService) {}

  /**
   * Proxy de imágenes público (así funcionan las <img src="..."> del panel,
   * que no pueden mandar un header Authorization). Solo relee una URL http(s)
   * y la re-sirve — no expone ninguna credencial: la key de Apify para el
   * fallback por proxy vive en el backend (APIFY_API_KEY), nunca en la URL.
   */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400')
  async proxyImage(@Query('proxy') proxy: string, @Res() res: Response) {
    if (!proxy) throw new BadRequestException('Invalid Target');
    try {
      const { contentType, buffer } = await this.scrapeService.proxyImage(decodeURIComponent(proxy).trim());
      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    } catch (err) {
      res.status(404).send((err as Error).message);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  scrape(@Body() dto: ScrapeRequestDto) {
    return this.scrapeService.scrapeUrl(dto.url, dto.html, dto.trustHtml);
  }
}
