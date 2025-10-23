import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test orders list endpoint
    console.log('Testing GET /api/orders/list...');
    const response = await fetch('http://localhost:5000/api/orders/list');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ API Response received`);
    console.log(`📊 Total orders: ${data.orders?.length || 0}`);
    
    if (data.orders && data.orders.length > 0) {
      console.log('\n📋 Sample order:');
      const sample = data.orders[0];
      console.log(`  - ID: ${sample.id}`);
      console.log(`  - Kod: ${sample.kod || 'N/A'}`);
      console.log(`  - Customer: ${sample.customer_name || 'N/A'}`);
      console.log(`  - Material Grade: ${sample.material_grade || 'N/A'}`);
      console.log(`  - Total Price: €${sample.total_price_eur || 0}`);
      console.log(`  - Total Weight: ${sample.total_weight_kg || 0} kg`);
      console.log(`  - Source: ${sample.source_kind || 'N/A'}`);
    }
    
    console.log('\n✅ API test completed successfully!');
    
  } catch (error: any) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
