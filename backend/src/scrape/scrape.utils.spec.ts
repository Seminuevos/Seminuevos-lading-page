import {
  extractEngine,
  formatDamage,
  normalizeBodyType,
  normalizeFuel,
  normalizeTransmission,
  parseGeneric,
  scanForData,
} from './scrape.utils';

describe('scrape.utils', () => {
  describe('normalizeTransmission', () => {
    it('detecta variantes de manual', () => {
      expect(normalizeTransmission('Manual 6-speed')).toBe('Manual');
      expect(normalizeTransmission('M/T')).toBe('Manual');
    });
    it('todo lo demás es automático, incluyendo vacío', () => {
      expect(normalizeTransmission('Automatic')).toBe('Automático');
      expect(normalizeTransmission(undefined)).toBe('Automático');
    });
  });

  describe('normalizeFuel', () => {
    it('mapea diesel, híbrido y eléctrico', () => {
      expect(normalizeFuel('Diesel')).toBe('Diésel');
      expect(normalizeFuel('Hybrid')).toBe('Híbrido');
      expect(normalizeFuel('Electric')).toBe('Eléctrico');
      expect(normalizeFuel('Gas')).toBe('Gasolina');
    });
  });

  describe('normalizeBodyType', () => {
    it('detecta pickup, suv y sedán por palabras clave', () => {
      expect(normalizeBodyType('Crew Cab')).toBe('Pickup');
      expect(normalizeBodyType('', 'Jeep Wrangler 4x4')).toBe('SUV');
      expect(normalizeBodyType('4-Door Sedan')).toBe('Sedán');
    });
    it('por defecto es SUV si no matchea nada', () => {
      expect(normalizeBodyType('', '')).toBe('SUV');
    });
  });

  describe('extractEngine', () => {
    it('descarta valores inválidos como "1.0" o "N/A"', () => {
      expect(extractEngine('N/A', 'Honda Civic 2.0L I4')).toBe('2.0L I4');
    });
    it('combina configuración con litraje del título cuando el engine es solo "V6"', () => {
      expect(extractEngine('V6', '3.5L V6 Sedan')).toBe('3.5L V6');
    });
    it('devuelve el string tal cual si ya es válido', () => {
      expect(extractEngine('2.5L Turbo I4')).toBe('2.5L Turbo I4');
    });
  });

  describe('formatDamage', () => {
    it('traduce categorías de daño conocidas', () => {
      expect(formatDamage('FRONT END')).toBe('Daño Frontal');
      expect(formatDamage('HAIL')).toBe('Daño por Granizo');
      expect(formatDamage(null)).toBe('Sin daño mayor reportado');
    });
  });

  describe('scanForData', () => {
    it('extrae campos conocidos de un objeto anidado, sin sobreescribir lo ya encontrado', () => {
      const result = scanForData({
        Year: '2021',
        mkn: 'Toyota',
        nested: { Model: 'Corolla', VIN: '1HGCM82633A004352' },
      });
      expect(result.year).toBe('2021');
      expect(result.make).toBe('Toyota');
      expect(result.model).toBe('Corolla');
      expect(result.vin).toBe('1HGCM82633A004352');
    });

    it('prioriza buyNowPrice sobre currentBid', () => {
      const result = scanForData({ bnp: 15000, curm: 12000 });
      expect(result.price).toBe('$15,000');
      expect(result.isBuyNow).toBe(true);
    });
  });

  describe('parseGeneric', () => {
    it('extrae título y og:image cuando no hay ld+json', () => {
      const html = '<html><head><title>2022 Toyota Corolla</title><meta property="og:image" content="https://x.com/a.jpg"></head></html>';
      const result = parseGeneric(html);
      expect(result.title).toBe('2022 Toyota Corolla');
      expect(result.images).toEqual(['https://x.com/a.jpg']);
    });
  });
});
