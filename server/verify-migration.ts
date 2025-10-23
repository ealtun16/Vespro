import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Arc1234..@localhost:5432/vespro_db'
});

async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying migration results...\n');
    
    const tables = [
      'users',
      'settings',
      'materials',
      'tank_specifications',
      'cost_analyses',
      'cost_analysis_materials',
      'turkish_cost_analyses',
      'turkish_cost_items',
      'chat_sessions',
      'chat_messages',
      'sheet_upload',
      'tank_order',
      'cost_item',
      'uom_unit',
      'material_quality',
      'material_type',
      'labor_role',
      'labor_rate',
      'labor_log',
    ];
    
    console.log('📊 Row counts in public schema:\n');
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        const icon = count > 0 ? '✓' : '○';
        console.log(`  ${icon} ${table.padEnd(30)} ${count.toLocaleString()} rows`);
      } catch (error) {
        console.log(`  ✗ ${table.padEnd(30)} (table not found)`);
      }
    }
    
    // Check vespro schema
    console.log('\n📊 Row counts in vespro schema:\n');
    
    const vespro_tables = ['forms', 'materials', 'cost_groups', 'cost_items'];
    
    for (const table of vespro_tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM vespro.${table}`);
        const count = parseInt(result.rows[0].count);
        const icon = count > 0 ? '✓' : '○';
        console.log(`  ${icon} vespro.${table.padEnd(25)} ${count.toLocaleString()} rows`);
      } catch (error) {
        console.log(`  ✗ vespro.${table.padEnd(25)} (table not found)`);
      }
    }
    
    // Sample data check
    console.log('\n📋 Sample data verification:\n');
    
    try {
      const formResult = await client.query('SELECT COUNT(*) as count FROM vespro.forms LIMIT 1');
      console.log(`  ✓ Vespro forms accessible`);
    } catch (error) {
      console.log(`  ✗ Error accessing vespro.forms`);
    }
    
    try {
      const orderResult = await client.query('SELECT COUNT(*) as count FROM tank_order LIMIT 1');
      console.log(`  ✓ Tank orders accessible`);
    } catch (error) {
      console.log(`  ✗ Error accessing tank_order`);
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMigration().catch(console.error);
