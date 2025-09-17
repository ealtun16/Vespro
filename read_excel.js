import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Excel file
const filePath = path.join(__dirname, 'attached_assets', 'Vespro - Ekipman Maliyet Analiz Formu (1)_1758118043912.xlsx');
const workbook = XLSX.readFile(filePath);

// Print sheet names
console.log('Sheet Names:', workbook.SheetNames);

// Process each sheet
workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n=== Sheet ${index + 1}: ${sheetName} ===`);
  
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON to see the data structure
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  // Print first 20 rows to understand the structure
  console.log('Data structure (first 20 rows):');
  jsonData.slice(0, 20).forEach((row, rowIndex) => {
    if (row && row.length > 0) {
      console.log(`Row ${rowIndex + 1}:`, row);
    }
  });
  
  console.log(`\nTotal rows in ${sheetName}: ${jsonData.length}`);
});