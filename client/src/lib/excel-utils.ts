import * as XLSX from 'xlsx';

export interface ExcelRowData {
  'Report ID'?: string;
  'Tank Type'?: string;
  'Tank Name'?: string;
  'Capacity'?: number;
  'Height'?: number;
  'Material Cost'?: number;
  'Labor Cost'?: number;
  'Overhead Cost'?: number;
  'Total Cost'?: number;
  'Material'?: string;
  'Thickness'?: number;
  'Pressure'?: number;
  'Temperature'?: number;
}

export function parseExcelFile(file: File): Promise<ExcelRowData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as ExcelRowData[];
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function validateExcelData(data: ExcelRowData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredColumns = ['Report ID', 'Tank Type', 'Total Cost'];
  
  if (data.length === 0) {
    errors.push('Excel file is empty');
    return { valid: false, errors };
  }
  
  // Check if required columns exist
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  // Validate data types and values
  data.forEach((row, index) => {
    if (!row['Report ID']) {
      errors.push(`Row ${index + 2}: Report ID is required`);
    }
    
    if (!row['Tank Type']) {
      errors.push(`Row ${index + 2}: Tank Type is required`);
    }
    
    if (!row['Total Cost'] || isNaN(Number(row['Total Cost']))) {
      errors.push(`Row ${index + 2}: Total Cost must be a valid number`);
    }
    
    if (row['Capacity'] && isNaN(Number(row['Capacity']))) {
      errors.push(`Row ${index + 2}: Capacity must be a valid number`);
    }
    
    if (row['Height'] && isNaN(Number(row['Height']))) {
      errors.push(`Row ${index + 2}: Height must be a valid number`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

export function exportToExcel(data: any[], filename: string = 'export.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, filename);
}
