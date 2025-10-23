import pg from 'pg';
const { Pool } = pg;

// Source database (Neon)
const sourcePool = new Pool({
  host: 'ep-billowing-boat-afmcdeh1.c-2.us-west-2.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_X7uCfkKETU4D',
  ssl: { rejectUnauthorized: false }
});

// Target database (Local)
const targetPool = new Pool({
  connectionString: 'postgresql://postgres:Arc1234..@localhost:5432/vespro_db'
});

interface TableInfo {
  name: string;
  schema?: string;
  dependencies?: string[];
}

// Tables to migrate in order (respecting foreign key dependencies)
const tablesToMigrate: TableInfo[] = [
  // Dictionary tables first (no dependencies)
  { name: 'uom_unit' },
  { name: 'material_quality' },
  { name: 'material_type' },
  { name: 'labor_role' },
  
  // User and settings
  { name: 'users' },
  { name: 'settings' },
  
  // Materials and tank specs (independent)
  { name: 'materials' },
  { name: 'tank_specifications' },
  
  // Sheet uploads (independent)
  { name: 'sheet_upload' },
  
  // Tank orders (depends on sheet_upload)
  { name: 'tank_order' },
  
  // Cost analyses (depends on tank_specifications)
  { name: 'cost_analyses' },
  
  // Chat sessions (depends on users and turkish_cost_analyses)
  { name: 'turkish_cost_analyses' },
  { name: 'chat_sessions' },
  
  // Dependent tables
  { name: 'cost_analysis_materials' },
  { name: 'turkish_cost_items' },
  { name: 'chat_messages' },
  { name: 'labor_rate' },
  { name: 'labor_log' },
  { name: 'tank_order_header_raw' },
  { name: 'cost_item' },
  { name: 'cost_item_raw' },
  
  // Vespro schema tables
  { name: 'materials', schema: 'vespro' },
  { name: 'forms', schema: 'vespro' },
  { name: 'cost_groups', schema: 'vespro' },
  { name: 'cost_items', schema: 'vespro' },
];

async function getTableData(client: pg.PoolClient, tableName: string, schema: string = 'public') {
  const fullTableName = schema === 'public' ? tableName : `${schema}.${tableName}`;
  
  try {
    const result = await client.query(`SELECT * FROM ${fullTableName}`);
    return result.rows;
  } catch (error) {
    console.log(`⚠️  Table ${fullTableName} not found or error reading it, skipping...`);
    return [];
  }
}

async function getTableColumns(client: pg.PoolClient, tableName: string, schema: string = 'public') {
  const result = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schema, tableName]);
  
  return result.rows.map(r => r.column_name);
}

async function truncateTable(client: pg.PoolClient, tableName: string, schema: string = 'public') {
  const fullTableName = schema === 'public' ? tableName : `${schema}.${tableName}`;
  
  try {
    await client.query(`TRUNCATE TABLE ${fullTableName} CASCADE`);
    console.log(`✓ Truncated ${fullTableName}`);
  } catch (error) {
    console.log(`⚠️  Could not truncate ${fullTableName}, table may not exist`);
  }
}

async function insertData(
  client: pg.PoolClient,
  tableName: string,
  columns: string[],
  rows: any[],
  schema: string = 'public'
) {
  if (rows.length === 0) {
    console.log(`  No data to insert for ${tableName}`);
    return;
  }

  const fullTableName = schema === 'public' ? tableName : `${schema}.${tableName}`;
  
  // Build INSERT query
  const placeholders = rows.map((_, rowIdx) => {
    const valuePlaceholders = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ');
    return `(${valuePlaceholders})`;
  }).join(', ');
  
  const query = `
    INSERT INTO ${fullTableName} (${columns.map(c => `"${c}"`).join(', ')})
    VALUES ${placeholders}
    ON CONFLICT DO NOTHING
  `;
  
  const values = rows.flatMap(row => columns.map(col => row[col]));
  
  try {
    await client.query(query, values);
    console.log(`  ✓ Inserted ${rows.length} rows into ${fullTableName}`);
  } catch (error: any) {
    console.error(`  ✗ Error inserting into ${fullTableName}:`, error.message);
    throw error;
  }
}

async function migrateTable(
  sourceClient: pg.PoolClient,
  targetClient: pg.PoolClient,
  tableInfo: TableInfo
) {
  const { name: tableName, schema = 'public' } = tableInfo;
  const fullTableName = schema === 'public' ? tableName : `${schema}.${tableName}`;
  
  console.log(`\n📋 Migrating ${fullTableName}...`);
  
  try {
    // Get data from source
    const data = await getTableData(sourceClient, tableName, schema);
    
    if (data.length === 0) {
      console.log(`  ℹ️  No data found in ${fullTableName}`);
      return;
    }
    
    // Get columns from target
    const columns = await getTableColumns(targetClient, tableName, schema);
    
    if (columns.length === 0) {
      console.log(`  ⚠️  Table ${fullTableName} does not exist in target database, skipping...`);
      return;
    }
    
    // Filter data to only include columns that exist in target
    const filteredData = data.map(row => {
      const filteredRow: any = {};
      columns.forEach(col => {
        if (col in row) {
          filteredRow[col] = row[col];
        }
      });
      return filteredRow;
    });
    
    // Truncate target table first
    await truncateTable(targetClient, tableName, schema);
    
    // Insert data in batches of 100 rows
    const batchSize = 100;
    for (let i = 0; i < filteredData.length; i += batchSize) {
      const batch = filteredData.slice(i, i + batchSize);
      await insertData(targetClient, tableName, columns, batch, schema);
    }
    
    console.log(`✅ Successfully migrated ${fullTableName} (${data.length} rows)`);
  } catch (error: any) {
    console.error(`❌ Error migrating ${fullTableName}:`, error.message);
  }
}

async function resetSequences(client: pg.PoolClient) {
  console.log('\n🔄 Resetting sequences...');
  
  const sequences = [
    { table: 'uom_unit', column: 'id', sequence: 'uom_unit_id_seq' },
    { table: 'material_quality', column: 'id', sequence: 'material_quality_id_seq' },
    { table: 'material_type', column: 'id', sequence: 'material_type_id_seq' },
    { table: 'labor_role', column: 'id', sequence: 'labor_role_id_seq' },
    { table: 'sheet_upload', column: 'id', sequence: 'sheet_upload_id_seq' },
    { table: 'tank_order', column: 'id', sequence: 'tank_order_id_seq' },
    { table: 'labor_rate', column: 'id', sequence: 'labor_rate_id_seq' },
    { table: 'labor_log', column: 'id', sequence: 'labor_log_id_seq' },
    { table: 'tank_order_header_raw', column: 'id', sequence: 'tank_order_header_raw_id_seq' },
    { table: 'cost_item', column: 'id', sequence: 'cost_item_id_seq' },
    { table: 'cost_item_raw', column: 'id', sequence: 'cost_item_raw_id_seq' },
    { table: 'vespro.materials', column: 'material_id', sequence: 'vespro.materials_material_id_seq' },
    { table: 'vespro.cost_groups', column: 'group_id', sequence: 'vespro.cost_groups_group_id_seq' },
    { table: 'vespro.cost_items', column: 'item_id', sequence: 'vespro.cost_items_item_id_seq' },
  ];
  
  for (const seq of sequences) {
    try {
      await client.query(`
        SELECT setval('${seq.sequence}', 
          COALESCE((SELECT MAX(${seq.column}) FROM ${seq.table}), 1)
        )
      `);
      console.log(`  ✓ Reset ${seq.sequence}`);
    } catch (error) {
      console.log(`  ⚠️  Could not reset ${seq.sequence}, may not exist`);
    }
  }
}

async function main() {
  console.log('🚀 Starting database migration...\n');
  console.log('Source: Neon Database (ep-billowing-boat-afmcdeh1.c-2.us-west-2.aws.neon.tech)');
  console.log('Target: Local Database (localhost:5432/vespro_db)\n');
  
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  
  try {
    console.log('✓ Connected to source database');
    console.log('✓ Connected to target database');
    
    // Disable foreign key checks temporarily
    await targetClient.query('SET session_replication_role = replica;');
    
    // Migrate each table
    for (const tableInfo of tablesToMigrate) {
      await migrateTable(sourceClient, targetClient, tableInfo);
    }
    
    // Re-enable foreign key checks
    await targetClient.query('SET session_replication_role = DEFAULT;');
    
    // Reset sequences
    await resetSequences(targetClient);
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(console.error);
