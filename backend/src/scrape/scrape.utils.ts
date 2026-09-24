import * as cheerio from 'cheerio';

export function normalizeTransmission(trans: unknown): string {
  if (!trans) return 'Automático';
  const s = String(trans).toLowerCase();
  if (s.includes('manual') || s.includes('mecanic') || s.includes('mecánic') || s.includes('stick') || s.includes('m/t')) {
    return 'Manual';
  }
  return 'Automático';
}

export function normalizeFuel(fuel: unknown): string {
  if (!fuel) return 'Gasolina';
  const s = String(fuel).toLowerCase();
  if (s.includes('diesel') || s.includes('diésel') || s.includes('petrol')) return 'Diésel';
  if (s.includes('hibrid') || s.includes('híbrid') || s.includes('hybrid') || s.includes('phev')) return 'Híbrido';
  if (s.includes('electr') || s.includes('eléctr') || s.includes('ev') || s.includes('bev')) return 'Eléctrico';
  return 'Gasolina';
}

export function normalizeBodyType(body: unknown, title = ''): string {
  const s = `${body || ''} ${title || ''}`.toLowerCase();
  if (
    s.includes('pickup') ||
    s.includes('truck') ||
    s.includes('crew cab') ||
    s.includes('double cab') ||
    s.includes('extended cab') ||
    s.includes('regular cab')
  )
    return 'Pickup';
  if (
    s.includes('suv') ||
    s.includes('crossover') ||
    s.includes('jeep') ||
    s.includes('wrangler') ||
    s.includes('4x4') ||
    s.includes('cherokee') ||
    s.includes('tahoe') ||
    s.includes('suburban') ||
    s.includes('explorer') ||
    s.includes('rav4') ||
    s.includes('cr-v')
  )
    return 'SUV';
  if (s.includes('hatchback') || s.includes('hatch') || s.includes('5-door')) return 'Hatchback';
  if (s.includes('convertible') || s.includes('cabrio') || s.includes('spider')) return 'Convertible';
  if (s.includes('coupe') || s.includes('coupé')) return 'Coupé';
  if (s.includes('van') || s.includes('minivan')) return 'Van';
  if (s.includes('wagon')) return 'Wagon';
  if (s.includes('sedan') || s.includes('sedán') || s.includes('4-door') || s.includes('4dr')) return 'Sedán';
  return 'SUV';
}

export function extractEngine(engine: unknown, title = '', html = ''): string {
  const isInvalid = (e: unknown) => {
    if (!e) return true;
    const s = String(e).trim();
    if (s === 'N/A' || s === '0.0' || s === '0' || s === '1' || s === '1.0' || s === '1.0L' || s === '2.6' || s.toLowerCase().includes('unknown')) {
      return true;
    }
    if (/^\d+\.?\d*$/.test(s)) return true;
    return false;
  };

  if (!isInvalid(engine) && String(engine).trim().length > 2) {
    const engStr = String(engine).trim();
    if (/^(TURBO|V6|V8|I4|I6|HEMI|ECOBOOST|TWIN TURBO)$/i.test(engStr)) {
      const combinedText = `${title} ${html}`.toUpperCase();
      const literMatch = combinedText.match(/\b([1-7]\.[0-9]|8\.0)\s*L?\b/i);
      if (literMatch) {
        return `${literMatch[1]}L ${engStr}`.toUpperCase();
      }
      if (engStr.toUpperCase() === 'TURBO') return '2.0L TURBO';
      if (engStr.toUpperCase() === 'I4') return '2.4L I4';
      if (engStr.toUpperCase() === 'V6') return '3.6L V6';
    }
    return engStr;
  }

  const combined = `${engine || ''} ${title || ''} ${html || ''}`.toUpperCase();

  const literMatch = combined.match(/\b([1-7]\.[0-9]|8\.0)\s*L?\b/i);
  const configMatch = combined.match(/\b(V6|V8|I4|I6|HEMI|TURBO|ECOBOOST|TWIN TURBO|4-CYL|6-CYL|8-CYL)\b/i);

  if (literMatch && configMatch) {
    return `${literMatch[1]}L ${configMatch[1]}`.toUpperCase();
  }
  if (literMatch) {
    return `${literMatch[1]}L`.toUpperCase();
  }
  if (configMatch) {
    const cfg = configMatch[1].toUpperCase();
    if (cfg === 'V6') return '3.6L V6';
    if (cfg === 'V8') return '5.7L V8';
    return `2.0L ${cfg}`;
  }

  return '2.0L Turbo';
}

export function formatDamage(dmg: unknown): string {
  if (!dmg) return 'Sin daño mayor reportado';
  const s = String(dmg).toUpperCase();
  if (s.includes('FRONT')) return 'Daño Frontal';
  if (s.includes('REAR')) return 'Daño Trasero';
  if (s.includes('SIDE')) return 'Daño Lateral';
  if (s.includes('ALL OVER') || s.includes('ALL-OVER')) return 'Daño General / Múltiple';
  if (s.includes('ROLLOVER')) return 'Vuelco';
  if (s.includes('WATER') || s.includes('FLOOD')) return 'Daño por Inundación / Agua';
  if (s.includes('VANDALISM')) return 'Vandalismo';
  if (s.includes('HAIL')) return 'Daño por Granizo';
  if (s.includes('MECHANICAL')) return 'Falla Mecánica';
  if (s.includes('NORMAL WEAR')) return 'Desgaste Normal (Sin Daño Estructural)';
  if (s.includes('MINOR') || s.includes('SCRATCH')) return 'Detalles / Rayones Menores';
  if (s.includes('UNDERCARRIAGE')) return 'Daño Inferior / Chasis';
  if (s.includes('BURN') || s.includes('FIRE')) return 'Daño por Fuego';
  return String(dmg);
}

export function scanForData(obj: any, data: Record<string, any> = {}): Record<string, any> {
  if (!obj || typeof obj !== 'object') return data;

  const keys = Object.keys(obj);
  const getVal = (k: string) => {
    const found = keys.find((key) => key.toLowerCase() === k.toLowerCase());
    return found ? obj[found] : null;
  };

  const year = getVal('Year') || getVal('lcy') || getVal('modelYear') || getVal('vehicleYear');
  if (year && !data.year) data.year = String(year);

  const make = getVal('Make') || getVal('mkn') || getVal('brand') || getVal('makeName');
  if (make && !data.make) data.make = String(make);

  const model = getVal('Model') || getVal('lm') || getVal('modelName');
  if (model && !data.model) data.model = String(model);

  const series = getVal('Series') || getVal('srs') || getVal('trim') || getVal('seriesName');
  if (series && !data.series) data.series = String(series);

  const vin = getVal('VIN') || getVal('fv') || getVal('vin') || getVal('vinNumber');
  if (vin && !data.vin) data.vin = String(vin);

  const odo = getVal('ODOValue') || getVal('orr') || getVal('odometer') || getVal('mileage') || getVal('odometerReading');
  if (odo && !data.km) {
    const uom = getVal('ODOUoM') || getVal('uom') || getVal('mileageUnit') || '';
    data.km = `${odo} ${uom}`.trim();
    if (!uom && String(odo).length > 3) data.km += ' mi';
  }

  const engine = getVal('engineDescription') || getVal('engineDesc') || getVal('engineType') || getVal('engine') || getVal('motor');
  if (engine && !data.engine && !/^\d+\.?\d*$/.test(String(engine).trim())) {
    data.engine = String(engine);
  }

  const trans = getVal('transmissionDescription') || getVal('Transmission') || getVal('tsmn') || getVal('transmission') || getVal('transmissionType');
  if (trans && !data.transmission) data.transmission = String(trans);

  const body = getVal('bodyStyleDescription') || getVal('BodyStyle') || getVal('bs') || getVal('bodyType') || getVal('bodyStyle') || getVal('body');
  if (body && !data.bodyType) data.bodyType = String(body);

  const fuel = getVal('fuelTypeDescription') || getVal('FuelType') || getVal('ft') || getVal('fuelType');
  if (fuel && !data.fuel) data.fuel = String(fuel);

  const color = getVal('Color') || getVal('clr') || getVal('exteriorColor');
  if (color && !data.color) data.color = String(color);

  const location = getVal('SellingBranch') || getVal('BranchName') || getVal('Location') || getVal('loc') || getVal('saleLocation') || getVal('branchName') || getVal('yardName');
  if (location && !data.location) data.location = String(location);

  const damage = getVal('PrimaryDamageDescription') || getVal('PrimaryDamage') || getVal('dd') || getVal('primaryDamage') || getVal('damage') || getVal('damageDescription') || getVal('lossType');
  if (damage && !data.damage) data.damage = String(damage);

  const bnp = getVal('buyNowPrice') || getVal('bnp') || getVal('buyItNowPrice');
  const bid = getVal('highBidAmount') || getVal('curm') || getVal('currentBid') || getVal('currentBidAmount');

  if (bnp) {
    data.price = `$${parseInt(bnp, 10).toLocaleString('en-US')}`;
    data.isBuyNow = true;
  } else if (bid && !data.price) {
    data.price = `$${parseInt(bid, 10).toLocaleString('en-US')}`;
    data.isBuyNow = false;
  }

  for (const k in obj) {
    if (obj[k] && typeof obj[k] === 'object' && k !== 'ancestors' && k !== 'images') {
      scanForData(obj[k], data);
    }
  }
  return data;
}

export function parseGeneric(html: string): Record<string, any> {
  const result: Record<string, any> = { title: 'Vehículo', images: [] };

  const ldJsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  if (ldJsonMatch) {
    for (const s of ldJsonMatch) {
      try {
        const json = JSON.parse(s.replace(/<[^>]*>/g, ''));
        if (json.name) result.title = json.name;
        if (json.image) result.images = Array.isArray(json.image) ? json.image : [json.image];
        if (json.brand) result.make = typeof json.brand === 'string' ? json.brand : json.brand.name;
      } catch {
        /* ignore malformed ld+json blocks */
      }
    }
  }

  if (result.title === 'Vehículo') {
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) result.title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  if (result.images.length === 0) {
    const ogImg = html.match(/meta property="og:image" content="([^"]+)"/);
    if (ogImg) result.images = [ogImg[1]];
  }

  return result;
}

export function parseCopart(html: string, url: string, trustHtml = false): Record<string, any> {
  if (!trustHtml && (html.includes('Additional security check') || html.includes('captcha') || html.includes('Imperva') || html.includes('Incapsula'))) {
    throw new Error('Copart Bloqueado. Usa Modo Manual.');
  }

  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const rawData: Record<string, any> = {};
  for (const s of scripts) {
    if (s.includes('lcy') || s.includes('mkn') || s.includes('lotDetails')) {
      const m = s.match(/\{"[a-z0-9]+"[\s\S]*?\}/g);
      if (m) {
        for (const j of m) {
          try {
            const obj = JSON.parse(j);
            scanForData(obj, rawData);
            if (obj.imagesList && obj.imagesList.fullImages) {
              if (!rawData.images) rawData.images = [];
              obj.imagesList.fullImages.forEach((img: any) => {
                if (img.url) rawData.images.push(img.url);
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  if (!rawData.year || !rawData.make) {
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const titleTag = (titleMatch?.[1] || '').toUpperCase();

    const yearMatch = titleTag.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) rawData.year = yearMatch[0];

    if (titleMatch) {
      const cleanTitle = titleMatch[1].split(/\||Copart/i)[0].trim().replace(/\s+/g, ' ');
      const titleParts = cleanTitle.split(/[\s-]+/).filter(Boolean);
      if (titleParts.length >= 2) {
        if (!rawData.year && titleParts[0].match(/\b(19|20)\d{2}\b/)) {
          rawData.year = titleParts[0];
          rawData.make = titleParts[1];
          rawData.model = titleParts.slice(2).join(' ');
        } else if (!rawData.make) {
          rawData.make = titleParts[0];
          rawData.model = titleParts.slice(1).join(' ');
        }
      }
    }
  }

  if (!rawData.year || !rawData.make) throw new Error('Datos no encontrados en Copart. Usa Modo Manual.');

  if (!rawData.images || rawData.images.length === 0) {
    const imgReg = /https?:\/\/[^"']+\.copart\.com\/[^"']+\d+_[a-z]\.jpg/gi;
    const matches = html.match(imgReg);
    rawData.images = [...new Set(matches || [])].map((img) => img.replace(/_[a-z]\.jpg/i, '_full.jpg'));
  }

  const formattedDamage = formatDamage(rawData.damage);
  const formattedLocation = rawData.location || 'EE. UU. (Copart)';
  const fullTitle = `${rawData.year} ${rawData.make} ${rawData.model || ''}`.trim().replace(/\s+/g, ' ');
  const normTrans = normalizeTransmission(rawData.transmission);
  const normFuelType = normalizeFuel(rawData.fuel);
  const normBody = normalizeBodyType(rawData.bodyType, fullTitle);
  const normEng = extractEngine(rawData.engine, fullTitle, html);

  return {
    title: fullTitle,
    year: rawData.year,
    price: rawData.price || 'Consultar',
    km: rawData.km || '0 KM',
    engine: normEng,
    transmission: normTrans,
    bodyType: normBody,
    fuel: normFuelType,
    vin: rawData.vin || 'N/A',
    damage: formattedDamage,
    location: formattedLocation,
    images: rawData.images || [],
    description: `📋 FICHA TÉCNICA Y ESPECIFICACIONES:
• Vehículo: ${fullTitle}
• Motor: ${normEng}
• Transmisión: ${normTrans}
• Recorrido: ${rawData.km || 'N/A'}
• Tipo de Accidente / Condición: ${formattedDamage}
• Ubicación de Origen: ${formattedLocation}
• Combustible: ${normFuelType}
• Color Exterior: ${rawData.color || 'N/A'}
• Número VIN: ${rawData.vin || 'N/A'}

🚗 Importado especialmente vía subasta Copart.

[ADMIN-LINK]: ${url}`,
  };
}

export function parseIAAI(html: string, url: string, trustHtml = false): Record<string, any> {
  if (!trustHtml) {
    const isBlocked =
      html.includes('Additional security check') ||
      html.includes('captcha') ||
      html.includes('Imperva') ||
      html.includes('Incapsula') ||
      html.includes('Pardon Our Interruption') ||
      html.includes('Access Denied') ||
      html.includes('Reference #') ||
      html.includes('distil') ||
      html.length < 500;

    if (isBlocked) {
      throw new Error('IAAI Bloqueado. Usa Modo Manual (pega el HTML) o verifica si tu Proxy tiene créditos/antibot activado.');
    }
  }

  const $ = cheerio.load(html);
  let rawData: Record<string, any> = {};

  const vmStr = html.match(/<script[^>]*id=["']?ProductDetailsVM["']?[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (vmStr) {
    try {
      const vmJson = JSON.parse(vmStr);
      const attrs = vmJson?.inventoryView?.attributes || vmJson?.inventoryView || vmJson;
      if (attrs) {
        if (attrs.Year) rawData.year = String(attrs.Year);
        if (attrs.Make) rawData.make = String(attrs.Make);
        if (attrs.Model) rawData.model = String(attrs.Model);
        if (attrs.Series) rawData.series = String(attrs.Series);
        if (attrs.VIN && attrs.VIN !== 'N/A') rawData.vin = String(attrs.VIN);
        if (attrs.ODOValue) rawData.km = `${attrs.ODOValue} ${attrs.ODOUoM || 'mi'}`.trim();
        if (attrs.EngineSize || attrs.EngineInformation || attrs.Engine) rawData.engine = String(attrs.EngineSize || attrs.EngineInformation || attrs.Engine);
        if (attrs.Transmission) rawData.transmission = String(attrs.Transmission);
        if (attrs.PrimaryDamageDesc || attrs.PrimaryDamage) rawData.damage = String(attrs.PrimaryDamageDesc || attrs.PrimaryDamage);
        if (attrs.ExteriorColor) rawData.color = String(attrs.ExteriorColor);
        if (attrs.BranchName || attrs.LocName) rawData.location = String(attrs.BranchName || attrs.LocName);
        if (attrs.VehicleClass || attrs.Segment || attrs.BodyStyleName) rawData.bodyType = String(attrs.VehicleClass || attrs.Segment || attrs.BodyStyleName);
        if (attrs.BuyNowPrice || attrs.MinimumBidAmount) rawData.price = `$${parseInt(attrs.BuyNowPrice || attrs.MinimumBidAmount, 10).toLocaleString('en-US')}`;
      }
      scanForData(vmJson, rawData);
    } catch {
      /* ignore malformed VM json */
    }
  }

  const pageTitle = ($('#TitleSection').text() || $('title').text() || '').trim();
  if (pageTitle && (!rawData.make || !rawData.year)) {
    const titleMatch = pageTitle.match(/\b(19|20)\d{2}\b\s+([A-Za-z0-9]+)\s+(.*?)(?:\s+for\s+Auction|\s+for\s+Sale|\s*-\s*IAA|$)/i);
    if (titleMatch) {
      rawData.year = rawData.year || titleMatch[1];
      rawData.make = rawData.make || titleMatch[2];
      rawData.model = rawData.model || titleMatch[3].trim();
    }
  }

  const metaDesc = ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').trim();
  if (metaDesc) {
    if (!rawData.km) {
      const odoMatch = metaDesc.match(/Mileage:\s*([\d,]+(?:\s*mi|\s*km)?)/i);
      if (odoMatch) rawData.km = odoMatch[1];
    }
    if (!rawData.location) {
      const locMatch = metaDesc.match(/at\s+([^.]+?)\s+branch/i);
      if (locMatch) rawData.location = locMatch[1].trim();
    }
    if (!rawData.color) {
      const colorMatch = metaDesc.match(/Color:\s*([A-Za-z]+)/i);
      if (colorMatch) rawData.color = colorMatch[1].trim();
    }
    if (!rawData.transmission) {
      const transMatch = metaDesc.match(/Transmission:\s*([A-Za-z]+)/i);
      if (transMatch) rawData.transmission = transMatch[1].trim();
    }
  }

  const stateStr = html.match(/(?:window\.)?__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})(?:[;<\n]|$)/i)?.[1];
  if (stateStr) {
    try {
      rawData = scanForData(JSON.parse(stateStr), rawData);
    } catch {
      /* ignore */
    }
  }

  const nextDataStr = html.match(/<script[^>]*id=["']?__NEXT_DATA__["']?[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (nextDataStr) {
    try {
      rawData = scanForData(JSON.parse(nextDataStr), rawData);
    } catch {
      /* ignore */
    }
  }

  const getDOMValue = (keywords: string[]): string | null => {
    let result: string | null = null;
    $('*').each((_i, el) => {
      const text = $(el).text().trim().toLowerCase();
      const cleanText = text.replace(/:$/, '').trim();

      if ($(el).children().length <= 1) {
        if (keywords.some((kw) => cleanText === kw.toLowerCase())) {
          let val = $(el).next().text().trim();
          if (!val && $(el).parent().next().length) val = $(el).parent().next().text().trim();
          if (!val && $(el).nextAll('span, div, p').length) val = $(el).nextAll('span, div, p').first().text().trim();
          if (val && val.length < 50) {
            result = val.replace(/&amp;/g, '&');
            return false;
          }
        }

        const matchKw = keywords.find((kw) => text.startsWith(kw.toLowerCase() + ':') || text.startsWith(kw.toLowerCase() + ' :'));
        if (matchKw && !result) {
          const parts = $(el).text().split(':');
          if (parts.length > 1) {
            const val = parts.slice(1).join(':').trim();
            if (val && val.length < 50) {
              result = val.replace(/&amp;/g, '&');
              return false;
            }
          }
        }
      }
      return undefined;
    });
    return result;
  };

  if (!rawData.model || !rawData.year || !rawData.make) {
    const h1Text = $('h1, .vehicle-title, [class*="heading"], [class*="title"]').text().trim().toUpperCase() || $('title').text().trim().toUpperCase();
    if (h1Text) {
      const cleanH1 = h1Text.replace(/\|.*/, '').replace(/FOR SALE.*/, '').replace(/IAAI.*/, '').trim();
      const yearMatch = cleanH1.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        rawData.year = yearMatch[0];
        const afterYear = cleanH1.substring(cleanH1.indexOf(yearMatch[0]) + 4).trim();
        const parts = afterYear.split(/\s+/).filter(Boolean);
        if (parts[0]) rawData.make = parts[0];
        if (parts[1]) rawData.model = parts.slice(1, 5).join(' ');
      }
    }
  }

  if (!rawData.km) rawData.km = getDOMValue(['Odometer', 'Mileage', 'Odometer Reading']);
  if (!rawData.engine) rawData.engine = getDOMValue(['Engine Description', 'Engine', 'Engine Size', 'Motor']);
  if (!rawData.transmission) rawData.transmission = getDOMValue(['Transmission', 'Trans', 'Transmission Type']);
  if (!rawData.bodyType) rawData.bodyType = getDOMValue(['Body Style', 'Vehicle Class', 'Body']);
  if (!rawData.fuel) rawData.fuel = getDOMValue(['Fuel Type', 'Fuel']);
  if (!rawData.color) rawData.color = getDOMValue(['Exterior Color', 'Exterior/Interior', 'Color', 'Exterior']);
  if (!rawData.location) rawData.location = getDOMValue(['Selling Branch', 'Branch', 'Location', 'Sale Location', 'Yard']);
  if (!rawData.damage) rawData.damage = getDOMValue(['Primary Damage', 'Damage', 'Damage Description', 'Loss Type']);

  if (!rawData.vin) {
    const v = getDOMValue(['VIN', 'VIN (Status)', 'VIN:']);
    if (v) rawData.vin = v.split(' ')[0];
  }

  if (!rawData.price) {
    const p = getDOMValue(['Actual Cash Value', 'Estimated Repair Cost', 'ACV', 'Buy It Now', 'Current Bid']);
    if (p) rawData.price = p;
    else {
      const priceTagText = $('.price, [class*="price"], [class*="bid"], [class*="Amount"]').first().text();
      if (priceTagText) {
        const priceMatch = priceTagText.match(/\$[\d,]+/);
        if (priceMatch) rawData.price = priceMatch[0];
      }
    }
  }

  if (rawData.price && typeof rawData.price === 'string') {
    const cleanPrice = rawData.price.match(/\$[\d,]+/);
    rawData.price = cleanPrice ? cleanPrice[0] : 'Consultar';
  } else {
    rawData.price = 'Consultar';
  }

  if (!rawData.make || rawData.make === 'Vehículo' || String(rawData.make).includes('Access Denied')) {
    if (!trustHtml) {
      throw new Error('IAAI Bloqueado. Servidor requiere Headless Browser.');
    }
    rawData.make = 'Vehículo';
  }
  if (!rawData.year) rawData.year = new Date().getFullYear();

  const itemIdMatch = url.match(/\/VehicleDetail\/(\d+)/i);
  const itemId = itemIdMatch ? itemIdMatch[1] : null;

  const imgMatches = html.match(/https?:\/\/(?:vis|images|an-cdn)\.iaai\.com\/(?:inventory|resizer)[^"'\\]*/gi) || [];
  const mapResized = (img: string) => {
    img = img.replace(/\\u0026/g, '&');
    if (img.includes('resizer')) {
      return img.replace(/width=\d+/, 'width=1024').replace(/height=\d+/, 'height=768');
    }
    if (img.includes('width=')) return img.split('width=')[0] + 'width=1024';
    return img.replace(/\/\d+$/, '/1024');
  };

  let cleanImages = [...new Set(imgMatches)]
    .filter((img) => {
      if (img.toLowerCase().includes('similar') || img.includes('thumb')) return false;
      if (itemId && !img.includes(itemId)) return false;
      return true;
    })
    .map(mapResized);

  if (cleanImages.length === 0) {
    cleanImages = [...new Set(imgMatches)]
      .filter((img) => !(img.toLowerCase().includes('similar') || img.includes('thumb')))
      .map(mapResized);
  }

  cleanImages = cleanImages.slice(0, 20);

  const formattedDamage = formatDamage(rawData.damage);
  const formattedLocation = rawData.location || 'EE. UU. (Subasta)';

  const rawTitle = `${rawData.year} ${rawData.make} ${rawData.model || ''} ${rawData.series || ''}`.trim().replace(/\s+/g, ' ');
  const fullTitle = rawTitle.replace(/\s*LIVE AUCTION.*/i, '').replace(/\s*FOR SALE.*/i, '').trim();
  const normTrans = normalizeTransmission(rawData.transmission);
  const normFuelType = normalizeFuel(rawData.fuel);
  const normBody = normalizeBodyType(rawData.bodyType, fullTitle);
  const normEng = extractEngine(rawData.engine, fullTitle, html);

  return {
    title: fullTitle,
    year: rawData.year,
    price: rawData.price,
    km: rawData.km || '0 KM',
    engine: normEng,
    transmission: normTrans,
    bodyType: normBody,
    fuel: normFuelType,
    vin: rawData.vin || 'N/A',
    damage: formattedDamage,
    location: formattedLocation,
    images: cleanImages,
    description: `📋 FICHA TÉCNICA Y ESPECIFICACIONES:
• Vehículo: ${fullTitle}
• Motor: ${normEng}
• Transmisión: ${normTrans}
• Recorrido: ${rawData.km || 'N/A'}
• Tipo de Accidente / Condición: ${formattedDamage}
• Ubicación de Origen: ${formattedLocation}
• Combustible: ${normFuelType}
• Color Exterior: ${rawData.color || 'N/A'}
• Número VIN: ${rawData.vin || 'N/A'}

🚗 Importado especialmente bajo pedido. Contáctanos para cotizar impuestos y logística de importación.

[ADMIN-LINK]: ${url}`,
  };
}
