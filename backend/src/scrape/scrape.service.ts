import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
  extractEngine,
  formatDamage,
  normalizeBodyType,
  normalizeFuel,
  normalizeTransmission,
  parseCopart,
  parseGeneric,
  parseIAAI,
} from './scrape.utils';

export interface ScrapeResult {
  success: boolean;
  data?: Record<string, any>;
  message?: string;
}

export interface ImageProxyResult {
  contentType: string;
  buffer: Buffer;
}

/**
 * Reemplaza a api/scrape.js. Diferencia crítica de seguridad: la key de
 * Apify (proxy residencial usado para saltar el anti-bot de IAAI/Copart) ya
 * NUNCA se acepta desde el cliente — antes viajaba en cada request, sacada
 * de site_settings (de lectura pública). Ahora vive solo en
 * APIFY_API_KEY del entorno del backend.
 */
@Injectable()
export class ScrapeService {
  private readonly logger = new Logger(ScrapeService.name);

  constructor(private readonly config: ConfigService) {}

  private getApifyKey(): string | undefined {
    return this.config.get<string>('APIFY_API_KEY');
  }

  async proxyImage(targetUrl: string): Promise<ImageProxyResult> {
    if (!targetUrl.startsWith('http')) {
      throw new Error('Invalid Target');
    }

    const apifyKey = this.getApifyKey();
    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000) as any,
      });
      if (!response.ok) throw new Error('Direct failed');
    } catch {
      if (!apifyKey) throw new Error('Blocked');
      const agent = new HttpsProxyAgent(`http://auto:${apifyKey}@proxy.apify.com:8000`);
      response = await fetch(targetUrl, { agent, signal: AbortSignal.timeout(10000) as any });
    }

    if (!response.ok) throw new Error('Not found');
    const arrayBuffer = await response.arrayBuffer();
    return {
      contentType: response.headers.get('content-type') || 'image/jpeg',
      buffer: Buffer.from(arrayBuffer),
    };
  }

  async scrapeUrl(url: string, providedHtml?: string, trustHtml = false): Promise<ScrapeResult> {
    const apifyKey = this.getApifyKey();

    try {
      if (url.includes('iaai.com') && !providedHtml) {
        try {
          const jinaData = await this.scrapeJinaIAAI(url);
          if (jinaData && (jinaData.title || jinaData.make)) {
            return { success: true, data: jinaData };
          }
        } catch (e) {
          this.logger.warn(`Jina IAAI scraper warning: ${(e as Error).message}`);
        }
      }

      if (url.includes('iaai.com') && !providedHtml && apifyKey) {
        const actorResult = await this.scrapeIaaiActor(url, apifyKey);
        if (actorResult) return { success: true, data: actorResult };
      }

      const html = providedHtml || (await this.fetchHtml(url, apifyKey));

      if (!html) throw new Error('Página vacía. Verifica el link o proxy.');
      if (html.includes('Proxy Authentication Required')) throw new Error('Contraseña del Proxy inválida.');
      if (html.includes('ran out of credits') || html.includes('usage limit')) {
        throw new Error('Sin créditos disponibles en Apify.');
      }

      let result: Record<string, any>;
      if (url.includes('copart.com')) {
        result = parseCopart(html, url, trustHtml);
      } else if (url.includes('iaai.com')) {
        result = parseIAAI(html, url, trustHtml);
      } else {
        result = parseGeneric(html);
      }

      return { success: true, data: result };
    } catch (err) {
      this.logger.error(`Scrape error: ${(err as Error).message}`);
      return { success: false, message: (err as Error).message };
    }
  }

  private async fetchHtml(url: string, apifyKey?: string): Promise<string> {
    const isIAAI = url.includes('iaai.com');

    if (!apifyKey) {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
      return r.text();
    }

    const isBlocked = (t: string) =>
      !t ||
      t.includes('Pardon Our Interruption') ||
      t.includes('Incapsula') ||
      t.includes('Imperva') ||
      t.includes('Additional security check') ||
      t.includes('captcha') ||
      t.includes('Access Denied') ||
      t.includes('Reference #') ||
      t.includes('distil') ||
      t.length < 500;

    let text = '';
    for (let i = 0; i < 3; i++) {
      const session = Math.random().toString(36).substring(2, 12);
      const proxyUser = isIAAI ? 'groups-RESIDENTIAL' : 'auto';
      const proxyUrl = `http://${proxyUser},session-${session}:${apifyKey}@proxy.apify.com:8000`;
      const agent = new HttpsProxyAgent(proxyUrl);

      try {
        const r = await fetch(url, {
          agent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          signal: AbortSignal.timeout(15000) as any,
        });
        text = await r.text();
        if (!isBlocked(text)) break;
        this.logger.warn(`Intento ${i + 1} bloqueado.`);
      } catch (err) {
        this.logger.warn(`Intento ${i + 1} falló: ${(err as Error).message}`);
      }
    }
    return text;
  }

  private async scrapeIaaiActor(url: string, apifyKey: string): Promise<Record<string, any> | null> {
    const lotMatch = url.match(/VehicleDetail\/(\d+)|vehicle\/(\d+)|\/([\d]{7,9})(?:-[A-Z]+)?(?:\/|$|\?)/i);
    const lotId = lotMatch ? lotMatch[1] || lotMatch[2] || lotMatch[3] : null;

    try {
      const apifyRes = await fetch(
        `https://api.apify.com/v2/actors/yyMRiF5a4sHPCV0q9/run-sync-get-dataset-items?token=${encodeURIComponent(apifyKey)}&timeout=120&memory=512`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ detailUrls: [url], proxyConfiguration: { useApifyProxy: false } }),
          signal: AbortSignal.timeout(130000) as any,
        },
      );

      if (!apifyRes.ok) {
        const errText = await apifyRes.text().catch(() => '');
        this.logger.warn(`Apify IAAI actor HTTP ${apifyRes.status}: ${errText.substring(0, 200)}`);
        return null;
      }

      const items = (await apifyRes.json()) as any;
      const item = Array.isArray(items) ? items[0] : items;
      if (!item || !(item.year || item.make || item.title || item.stockNumber)) return null;

      let cleanImages: string[] = [];
      const imgCandidates = [item.images, item.imageUrls, item.imageLinks, item.photos, item.vehicleImages, item.imgUrls, item.photoUrls];
      for (const candidate of imgCandidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
          cleanImages = candidate.slice(0, 15).map((i: any) => (typeof i === 'string' ? i : i.url || i.src || i));
          break;
        }
      }
      if (cleanImages.length === 0 && lotId) {
        for (let i = 1; i <= 15; i++) {
          cleanImages.push(`https://vis.iaai.com/resizer?imageKeys=${lotId}~SID~S0~I${i}`);
        }
      }

      const year = item.year || item.modelYear || item.vehicleYear || item.lcy || '';
      const make = item.make || item.brand || item.makeName || item.mkn || item.manufacturer || '';
      const model = item.model || item.modelName || item.lm || '';
      const series = item.series || item.trim || item.trimLevel || item.seriesName || item.srs || item.subModel || '';
      const vin = item.vin || item.vinNumber || item.fv || item.vehicleVin || 'N/A';
      const rawOdo = item.odometer || item.mileage || item.odometerReading || item.km || item.miles || item.orr || item.odo || '';
      const odoUnit = item.odometerUnit || item.mileageUnit || item.uom || (String(rawOdo).includes('km') ? 'KM' : 'mi');
      const km = rawOdo ? `${rawOdo} ${odoUnit}`.trim().replace(/\s+/g, ' ') : '0 KM';
      const engine = item.engine || item.engineDescription || item.engineDesc || item.engineType || item.engineName || item.motor || '';
      const transmission = item.transmission || item.transmissionDescription || item.transmissionType || item.tsmn || '';
      const bodyType = item.bodyStyle || item.bodyType || item.bodyStyleDescription || item.body || item.bs || item.vehicleType || '';
      const fuel = item.fuelType || item.fuel || item.fuelTypeDescription || item.ft || '';
      const color = item.color || item.exteriorColor || item.primaryColor || item.clr || '';
      const location = item.location || item.sellingBranch || item.branchName || item.yard || item.yardName || item.saleLocation || item.facilityName || 'EE. UU. (IAAI)';
      const damage = item.damage || item.primaryDamage || item.damageDescription || item.lossType || item.dd || item.condition || '';

      const buyNow = item.buyNowPrice || item.bnp || item.buyItNowPrice || item.buyNow || 0;
      const currentBid = item.currentBid || item.highBid || item.highBidAmount || item.curm || item.bid || 0;
      const acv = item.acv || item.actualCashValue || item.estimatedValue || 0;
      const rawPrice = buyNow || currentBid || acv || item.price || item.salePrice || item.auctionPrice || 0;
      let formattedPrice = 'Consultar';
      if (rawPrice) {
        const numPrice = parseInt(String(rawPrice).replace(/[^0-9]/g, ''), 10);
        if (numPrice > 0) formattedPrice = `$${numPrice.toLocaleString('en-US')}`;
      }
      const priceType = buyNow ? '🔖 Buy It Now' : currentBid ? '🔨 Oferta Actual' : acv ? '💰 Valor Estimado' : '';

      const fullTitle = (item.title || `${year} ${make} ${model} ${series}`.trim()).replace(/\s+/g, ' ');
      const normTrans = normalizeTransmission(transmission);
      const normFuelType = normalizeFuel(fuel);
      const normBody = normalizeBodyType(bodyType, fullTitle);
      const normEng = extractEngine(engine, fullTitle, '');
      const formattedDamage = formatDamage(damage);

      return {
        title: fullTitle || `Vehículo IAAI #${lotId}`,
        year,
        price: formattedPrice,
        km,
        engine: normEng,
        transmission: normTrans,
        bodyType: normBody,
        fuel: normFuelType,
        vin,
        damage: formattedDamage,
        location,
        color,
        images: cleanImages,
        description: `📋 FICHA TÉCNICA Y ESPECIFICACIONES:
• Vehículo: ${fullTitle}
• Año: ${year}
• Motor: ${normEng}
• Transmisión: ${normTrans}
• Tipo de Carrocería: ${normBody}
• Combustible: ${normFuelType}
• Recorrido: ${km}
• Color Exterior: ${color || 'N/A'}
• Condición / Daño: ${formattedDamage}
• Ubicación de Subasta: ${location}
• Número VIN: ${vin}
${priceType ? `• Precio en Subasta: ${formattedPrice} (${priceType})` : ''}

🚗 Importado especialmente bajo pedido desde subasta IAAI.
Contáctanos para cotizar impuestos, logística y precio final.

[ADMIN-LINK]: ${url}`,
      };
    } catch (err) {
      this.logger.warn(`IAAI actor error: ${(err as Error).message}`);
      return null;
    }
  }

  private async scrapeJinaIAAI(url: string): Promise<Record<string, any> | null> {
    const lotMatch = url.match(/VehicleDetail\/(\d+)|vehicle\/(\d+)|\/([\d]{7,9})(?:-[A-Z]+)?(?:\/|$|\?)/i);
    const lotId = lotMatch ? lotMatch[1] || lotMatch[2] || lotMatch[3] : null;

    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(12000) as any,
      });

      if (!jinaRes.ok) return null;
      const text = await jinaRes.text();
      if (!text || text.length < 500) return null;

      const titleMatch =
        text.match(/Title:\s*(.*?)(?:\s+for\s+Auction|\s+for\s+Sale|\n|$)/i) ||
        text.match(/#\s*(19\d{2}|20\d{2})\s+([A-Za-z0-9]+)\s+([A-Za-z0-9\s]+)/i);

      let fullTitle = '';
      let year = '';
      let make = '';
      let model = '';
      let series = '';

      if (titleMatch) {
        fullTitle = (titleMatch[1] || titleMatch[0]).replace(/^#\s*/, '').replace(/for Auction/i, '').trim();
        const ymMatch = fullTitle.match(/\b((?:19|20)\d{2})\b\s+([A-Za-z0-9]+)(?:\s+([A-Za-z0-9]+))?(?:\s+(.*))?/i);
        if (ymMatch) {
          year = ymMatch[1];
          make = ymMatch[2];
          model = ymMatch[3] || '';
          series = ymMatch[4] || '';
        }
      }

      const odoMatch = text.match(/Odometer:\s*([^\n\r]+)/i);
      const km = odoMatch ? odoMatch[1].trim() : '0 KM';
      const engMatch = text.match(/Engine:\s*([^\n\r]+)/i);
      const rawEngine = engMatch ? engMatch[1].trim() : '';
      const transMatch = text.match(/Transmission:\s*([^\n\r]+)/i);
      const rawTrans = transMatch ? transMatch[1].trim() : '';
      const bodyMatch = text.match(/Body Style:\s*([^\n\r]+)/i);
      const rawBody = bodyMatch ? bodyMatch[1].trim() : '';
      const dmgMatch = text.match(/Primary Damage:\s*([^\n\r]+)/i);
      const rawDamage = dmgMatch ? dmgMatch[1].trim() : '';
      const locMatch = text.match(/Selling Branch:\s*([^\n\r]+)/i);
      const location = locMatch ? locMatch[1].trim() : 'EE. UU. (IAAI)';
      const vinMatch = text.match(/VIN\s*(?:\([^)]+\))?:\s*([A-Z0-9*]{11,17})/i);
      const vin = vinMatch ? vinMatch[1].trim() : 'N/A';

      const normTrans = normalizeTransmission(rawTrans);
      const normFuelType = normalizeFuel(rawEngine);
      const normBody = normalizeBodyType(rawBody, fullTitle);
      const normEng = extractEngine(rawEngine, fullTitle, '');
      const formattedDamage = formatDamage(rawDamage);

      const cleanImages: string[] = [];
      if (lotId) {
        for (let i = 1; i <= 15; i++) {
          cleanImages.push(`https://vis.iaai.com/resizer?imageKeys=${lotId}~SID~S0~I${i}`);
        }
      }

      if (!year && !make && !fullTitle) return null;

      return {
        title: fullTitle || `${year} ${make} ${model} ${series}`.trim() || `Vehículo IAAI #${lotId}`,
        year: year || new Date().getFullYear(),
        make,
        model,
        series,
        price: 'Consultar',
        km,
        engine: normEng,
        transmission: normTrans,
        bodyType: normBody,
        fuel: normFuelType,
        vin,
        damage: formattedDamage,
        location,
        images: cleanImages,
        description: `📋 FICHA TÉCNICA Y ESPECIFICACIONES:
• Vehículo: ${fullTitle}
• Año: ${year}
• Motor: ${normEng}
• Transmisión: ${normTrans}
• Tipo de Carrocería: ${normBody}
• Combustible: ${normFuelType}
• Recorrido: ${km}
• Condición / Daño: ${formattedDamage}
• Ubicación de Subasta: ${location}
• Número VIN: ${vin}

🚗 Importado especialmente bajo pedido desde subasta IAAI.
Contáctanos para cotizar impuestos, logística y precio final.

[ADMIN-LINK]: ${url}`,
      };
    } catch (e) {
      this.logger.warn(`Jina IAAI fetch error: ${(e as Error).message}`);
      return null;
    }
  }
}
