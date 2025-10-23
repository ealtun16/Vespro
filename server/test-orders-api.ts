async function testOrdersApi() {
  try {
    console.log('Testing /api/orders/list...\n');
    
    const response = await fetch('http://localhost:5000/api/orders/list');
    const data = await response.json();
    
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.orders && data.orders.length > 0) {
      const order = data.orders[0];
      console.log('\n=== First Order ===');
      console.log('ID:', order.id);
      console.log('Kod:', order.kod);
      console.log('Created Date:', order.created_date);
      console.log('Created At:', order.created_at);
      console.log('Source Filename:', order.source_filename);
    }
    
    // Test tank-forms endpoint
    if (data.orders && data.orders.length > 0) {
      const tankId = data.orders[0].id;
      console.log(`\n\nTesting /api/tank-forms/${tankId}...\n`);
      
      const tankResponse = await fetch(`http://localhost:5000/api/tank-forms/${tankId}`);
      const tankData = await tankResponse.json();
      
      console.log('Tank Response:');
      console.log('Excel Path:', tankData.excel_path);
      console.log('Excel Available:', tankData.excel_available);
      console.log('Fiyat Tarihi:', tankData.fiyat_tarihi);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testOrdersApi();
