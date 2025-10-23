import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:Arc1234..@localhost:5432/vespro_db'
});

async function createViews() {
  const client = await pool.connect();
  
  try {
    console.log('🔨 Creating database views...\n');
    
    // Create orders_list_view
    await client.query(`
      CREATE OR REPLACE VIEW orders_list_view AS
      SELECT 
        t.id,
        t.order_code AS kod,
        t.customer_name,
        t.project_code,
        t.diameter_mm,
        t.length_mm,
        t.pressure_bar,
        t.pressure_text,
        t.volume,
        t.material_grade,
        t.total_weight_kg,
        t.total_price_eur,
        t.labor_eur,
        t.outsource_eur,
        t.created_date,
        t.created_at,
        t.updated_at,
        t.source_kind,
        t.source_filename,
        t.source_sheet_id,
        t.sheet_name,
        -- Calculate costs from cost_item table
        COALESCE(SUM(ci.line_total_eur), 0) AS calculated_total_eur,
        COUNT(ci.id) AS item_count
      FROM tank_order t
      LEFT JOIN cost_item ci ON ci.order_id = t.id
      GROUP BY 
        t.id,
        t.order_code,
        t.customer_name,
        t.project_code,
        t.diameter_mm,
        t.length_mm,
        t.pressure_bar,
        t.pressure_text,
        t.volume,
        t.material_grade,
        t.total_weight_kg,
        t.total_price_eur,
        t.labor_eur,
        t.outsource_eur,
        t.created_date,
        t.created_at,
        t.updated_at,
        t.source_kind,
        t.source_filename,
        t.source_sheet_id,
        t.sheet_name
    `);
    
    console.log('✅ orders_list_view created successfully');
    
    // Test the view
    const testResult = await client.query('SELECT COUNT(*) as count FROM orders_list_view');
    console.log(`\n📊 View contains ${testResult.rows[0].count} records`);
    
    console.log('\n✅ All views created successfully!');
    
  } catch (error: any) {
    console.error('❌ Error creating views:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createViews().catch(console.error);
