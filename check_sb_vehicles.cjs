async function check() {
  const headers = {
    'apikey': 'sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z',
    'Authorization': 'Bearer sb_publishable_NXflNbXrjqQabsIGe0PHPQ_4CID6A9z'
  };
  try {
    const res = await fetch('https://hknprlgyuwzolgnkwsmx.supabase.co/rest/v1/vehicles?select=*', { headers });
    const data = await res.json();
    console.log('Vehicles status code:', res.status, res.statusText);
    console.log('Vehicles response data:', data);
  } catch (err) {
    console.error('Error:', err);
  }
}
check();
