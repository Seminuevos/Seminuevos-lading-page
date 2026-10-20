async function test() {
  const headers = {
    'apikey': 'sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z',
    'Authorization': 'Bearer sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z'
  };
  try {
    const [vRes, sRes, inqRes, leadRes] = await Promise.all([
      fetch('https://hknprlgyuwzolgnkwsmx.supabase.co/rest/v1/vehicles?select=*', { headers }),
      fetch('https://hknprlgyuwzolgnkwsmx.supabase.co/rest/v1/site_settings?select=*', { headers }),
      fetch('https://hknprlgyuwzolgnkwsmx.supabase.co/rest/v1/inquiries?select=*', { headers }),
      fetch('https://hknprlgyuwzolgnkwsmx.supabase.co/rest/v1/site_leads?select=*', { headers })
    ]);
    const v = await vRes.json();
    const s = await sRes.json();
    const inq = await inqRes.json();
    const l = await leadRes.json();
    console.log('Vehicles:', Array.isArray(v) ? v.length : v);
    console.log('Settings:', Array.isArray(s) ? s.length : s);
    console.log('Inquiries:', Array.isArray(inq) ? inq.length : inq);
    console.log('Leads:', Array.isArray(l) ? l.length : l);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
test();
