import * as XLSX from 'xlsx';
import { Product } from '../types';

/**
 * Parse CSV content string to Product[]
 */
export function parseCSV(content: string): Product[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const products: Product[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    const product: Product = {
      id: `${Date.now()}-${i}`,
      productId: getValueByHeader(headers, values, ['productid', 'product_id', 'id']) || `PROD-${Date.now()}-${i}`,
      name: getValueByHeader(headers, values, ['productname', 'product_name', 'name']) || 'Unknown Product',
      quantity: parseInt(getValueByHeader(headers, values, ['quantity', 'qty', 'stock']) || '0'),
      companyName: getValueByHeader(headers, values, ['companyname', 'company_name', 'company']) || 'Unknown Company',
      shopName: getValueByHeader(headers, values, ['shopname', 'shop_name', 'shop']) || 'Unknown Shop',
      price: parseFloat(getValueByHeader(headers, values, ['price', 'amount', 'cost']) || '0'),
      category: getValueByHeader(headers, values, ['category', 'type']),
      gst: parseFloat(getValueByHeader(headers, values, ['gst', 'tax']) || '0'),
      description: getValueByHeader(headers, values, ['description', 'desc']),
    };

    products.push(product);
  }

  return products;
}

/**
 * Parse Excel (.xls/.xlsx) file to Product[]
 */
export function parseExcel(file: File): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        const products: Product[] = rawData.map((row, index) => ({
          id: `${Date.now()}-${index}`,
          productId: getFirstMatch(row, ['productid', 'product_id', 'id']) || `PROD-${Date.now()}-${index}`,
          name: getFirstMatch(row, ['productname', 'product_name', 'name']) || 'Unknown Product',
          quantity: parseInt(getFirstMatch(row, ['quantity', 'qty', 'stock']) || '0'),
          companyName: getFirstMatch(row, ['companyname', 'company_name', 'company']) || 'Unknown Company',
          shopName: getFirstMatch(row, ['shopname', 'shop_name', 'shop']) || 'Unknown Shop',
          price: parseFloat(getFirstMatch(row, ['price', 'amount', 'cost']) || '0'),
          category: getFirstMatch(row, ['category', 'type']),
          gst: parseFloat(getFirstMatch(row, ['gst', 'tax']) || '0'),
          description: getFirstMatch(row, ['description', 'desc']),
        }));

        resolve(products);
      } catch (error) {
        reject(`Failed to parse Excel file: ${(error as Error).message}`);
      }
    };

    reader.onerror = () => reject('Failed to read Excel file');
    reader.readAsArrayBuffer(file); // ✅ Correct binary reading for Excel
  });
}

/**
 * Export products to CSV string
 */
export function exportToCSV(products: Product[]): string {
  const headers = ['Product ID', 'Name', 'Quantity', 'Company', 'Shop', 'Price', 'Category', 'GST', 'Description'];
  const rows = products.map(p => [
    p.productId,
    p.name,
    p.quantity.toString(),
    p.companyName,
    p.shopName,
    p.price.toString(),
    p.category || '',
    p.gst?.toString() || '',
    p.description || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Flexible column matching for CSV
 */
function getValueByHeader(headers: string[], values: string[], possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h.includes(name));
    if (index !== -1 && values[index]) {
      return values[index];
    }
  }
  return undefined;
}

/**
 * Flexible key matching for Excel rows
 */
function getFirstMatch(row: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const matchedKey = Object.keys(row).find(k => k.toLowerCase().includes(key));
    if (matchedKey && row[matchedKey] !== undefined) {
      return String(row[matchedKey]).trim();
    }
  }
  return '';
}
