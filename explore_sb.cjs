async function run() {
  const headers = {
    'apikey': 'sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z',
    'Authorization': 'Bearer sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z'
  };
  const res = await fetch('https://hknprlgyuwzolgnkwsmx.supabase.co/rest/v1/site_settings?select=*', { headers });
  const data = await res.json();
  console.log('--- SITE SETTINGS KEYS ---');
  for (const item of data) {
    const valPreview = typeof item.value === 'string' ? item.value.substring(0, 60) : JSON.stringify(item.value).substring(0, 60);
    console.log(`${item.key}: ${valPreview}`);
  }
}
run();
