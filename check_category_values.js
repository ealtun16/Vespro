import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Category Values Analysis ===\n');

// Read the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'Vespro - Ekipman Maliyet Analiz Formu (1)_1758118043912.xlsx');
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets['EV1'];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// Look at the category headers in row 6 (index 5)
const categoryHeaderRow = jsonData[5] || [];
console.log('Excel Category Headers (Row 6):');
categoryHeaderRow.forEach((cell, index) => {
  if (cell && typeof cell === 'string' && (cell.includes('ATÖLYE') || cell.includes('DIŞ'))) {
    console.log(`  Column ${index}: "${cell}"`);
  }
});

// Current database enum values
const dbCategories = ["ATOLYE_ISCILIK", "DIS_TEDARIK"];
console.log('\nCurrent Database Enum Values:');
dbCategories.forEach(cat => {
  console.log(`  "${cat}"`);
});

console.log('\n=== Mapping Analysis ===');
console.log('Excel: "ATÖLYE İŞÇİLİK" → Database: "ATOLYE_ISCILIK"');
console.log('Excel: "DIŞ TEDARİK" → Database: "DIS_TEDARIK"');

console.log('\n=== Recommendation ===');
console.log('✅ Current database enum values are appropriate');
console.log('✅ No Turkish special characters (İ, Ş) in database enum - good for SQL compatibility');
console.log('✅ Underscores instead of spaces - standard enum practice');
console.log('💡 UI layer should handle display mapping:');
console.log('   ATOLYE_ISCILIK → "ATÖLYE İŞÇİLİK" (display)');
console.log('   DIS_TEDARIK → "DIŞ TEDARİK" (display)');