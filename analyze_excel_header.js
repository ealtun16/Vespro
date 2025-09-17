import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'Vespro - Ekipman Maliyet Analiz Formu (1)_1758118043912.xlsx');
const workbook = XLSX.readFile(filePath);

const worksheet = workbook.Sheets['EV1'];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('=== Excel Form Header Analysis ===\n');

// Analyze the first 10 rows to understand header structure
console.log('Header rows (first 10 rows):');
jsonData.slice(0, 10).forEach((row, index) => {
  if (row && row.length > 0) {
    console.log(`Row ${index + 1}:`, row.filter(cell => cell !== null && cell !== undefined && cell !== ''));
  }
});

console.log('\n=== Key Header Information ===');

// Extract key header information
const row2 = jsonData[1] || [];
const row3 = jsonData[2] || [];

console.log('Form Code:', row2[2]);
console.log('Tank Name/Type:', row2[5]);
console.log('Tank Dimensions:', {
  width: row2[7],
  width_unit: row2[8],
  height: row2[9], 
  height_unit: row2[10],
  calculated_value: row2[11],
  some_number: row2[12]
});

console.log('Tank Type/Material:', row3[2]);
console.log('Additional Info:', {
  field1: row3[4],
  field2: row3[5],
  material_grade: row3[6],
  pressure: row3[8],
  summary_field: row3[10],
  revision_field: row3[11],
  revision_no: row3[12]
});

console.log('\n=== Column Headers (Row 5-6) ===');
const headerRow1 = jsonData[4] || [];
const headerRow2 = jsonData[5] || [];

console.log('Main headers:', headerRow1.filter(cell => cell !== null && cell !== undefined && cell !== ''));
console.log('Sub headers:', headerRow2.filter(cell => cell !== null && cell !== undefined && cell !== ''));