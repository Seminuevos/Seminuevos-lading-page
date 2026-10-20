const fs = require('fs');
const path = require('path');

const sqlContent = fs.readFileSync('setup_new_supabase.sql', 'utf-8');

// Regex for extracting vehicle insert statements
const vehicleRegex = /INSERT INTO vehicles \(([^)]+)\) VALUES \((.+?)\);/gs;

const vehicles = [];
let match;
let autoId = 1;

while ((match = vehicleRegex.exec(sqlContent)) !== null) {
  const valuesStr = match[2].trim();
  
  // Custom parser for the SQL VALUES tuple
  // The tuple format is:
  // ('title', 'price', year, 'km', 'engine', 'transmission', 'fuel', 'body_type', 'condition', 'availability', 'origin', 'badge', 'description', ARRAY['img1','img2']::text[], 'catalog', 'status')
  
  // Extract images array
  const arrayMatch = valuesStr.match(/ARRAY\[(.*?)\](?:::text\[\])?/);
  let images = [];
  if (arrayMatch) {
    const rawImgs = arrayMatch[1];
    images = rawImgs.split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  }

  // Replace array with placeholder so we can split easily
  const cleanValuesStr = valuesStr.replace(/ARRAY\[.*?\](?:::text\[\])?/, '__IMAGES__');
  
  // Tokenize by commas taking quotes into account
  const tokens = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < cleanValuesStr.length; i++) {
    const ch = cleanValuesStr[i];
    if (ch === "'") {
      if (inQuotes && cleanValuesStr[i+1] === "'") {
        cur += "'";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      tokens.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) tokens.push(cur.trim());

  const cleanToken = (val) => {
    if (!val) return '';
    let res = val.trim();
    if (res.startsWith("'") && res.endsWith("'")) {
      res = res.slice(1, -1);
    }
    return res;
  };

  const vObj = {
    id: autoId++,
    title: cleanToken(tokens[0]),
    price: cleanToken(tokens[1]),
    year: parseInt(tokens[2]) || 2024,
    km: cleanToken(tokens[3]),
    engine: cleanToken(tokens[4]),
    transmission: cleanToken(tokens[5]) || 'Automático',
    fuel: cleanToken(tokens[6]) || 'Gasolina',
    body_type: cleanToken(tokens[7]) || 'suv',
    condition: cleanToken(tokens[8]) || 'seminuevo',
    availability: cleanToken(tokens[9]) || 'entrega_inmediata',
    origin: cleanToken(tokens[10]) || 'importado',
    badge: cleanToken(tokens[11]),
    description: cleanToken(tokens[12]),
    images: images,
    catalog: cleanToken(tokens[14]) || 'seminuevos',
    status: cleanToken(tokens[15]) || 'active',
    mastertech: false,
    created_at: new Date().toISOString()
  };

  vehicles.push(vObj);
}

console.log(`Parsed ${vehicles.length} vehicles from setup_new_supabase.sql`);
fs.writeFileSync('scripts/parsed_vehicles.json', JSON.stringify(vehicles, null, 2), 'utf-8');
