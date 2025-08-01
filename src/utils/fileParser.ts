// utils/fileParser.ts
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Set up PDF.js worker with better error handling
const setupPDFWorker = () => {
  try {
    // Try local worker first
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
  } catch (error) {
    // Fallback to CDN
    console.warn('Local PDF worker not found, using CDN fallback');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
};

setupPDFWorker();

// Enhanced CSV parser with better delimiter detection
export const parseCSV = (content: string): any[] => {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Detect delimiter (comma, semicolon, or tab)
    const firstLine = lines[0];
    const delimiters = [',', ';', '\t'];
    let delimiter = ',';
    let maxColumns = 0;

    for (const del of delimiters) {
      const columns = firstLine.split(del).length;
      if (columns > maxColumns) {
        maxColumns = columns;
        delimiter = del;
      }
    }

    // Parse with detected delimiter
    const headers = lines[0]
      .split(delimiter)
      .map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]
        .split(delimiter)
        .map(v => v.trim().replace(/^["']|["']$/g, ''));
      
      if (values.length >= headers.length / 2) { // Allow some flexibility
        const product: any = {};
        headers.forEach((header, index) => {
          if (header && values[index] !== undefined) {
            product[header] = values[index];
          }
        });
        
        // Only add products with meaningful data
        if (Object.values(product).some(value => value && String(value).trim())) {
          products.push(product);
        }
      }
    }

    return products;
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced Excel parser with multiple sheet support
export const parseExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        
        let allProducts: any[] = [];

        // Process all sheets (or just the first one if you prefer)
        const sheetsToProcess = workbook.SheetNames.slice(0, 3); // Limit to first 3 sheets
        
        for (const sheetName of sheetsToProcess) {
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with better options
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
            raw: false // This ensures numbers stay as strings when needed
          }) as any[][];

          if (jsonData.length < 2) continue;

          // Get headers from first row
          const headers = jsonData[0].map((h: any) => 
            String(h || '').trim().toLowerCase()
          );
          
          // Skip if no meaningful headers
          if (!headers.some(h => h)) continue;

          // Process data rows
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // Skip empty rows
            if (!row || !row.some((cell: any) => 
              cell !== '' && cell !== null && cell !== undefined)) {
              continue;
            }

            const product: any = {};
            let hasData = false;

            headers.forEach((header, index) => {
              if (header && row[index] !== undefined && row[index] !== '') {
                // Clean and normalize the data
                let value = row[index];
                
                // Handle different data types
                if (typeof value === 'number') {
                  value = value.toString();
                } else if (value instanceof Date) {
                  value = value.toISOString().split('T')[0];
                } else {
                  value = String(value).trim();
                }

                product[header] = value;
                hasData = true;
              }
            });

            if (hasData) {
              // Add sheet information if multiple sheets
              if (workbook.SheetNames.length > 1) {
                product._sheet = sheetName;
              }
              allProducts.push(product);
            }
          }
        }

        resolve(allProducts);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

// Enhanced PDF parser with better pattern recognition
// Enhanced parsePDF function in utils/fileParser.ts
export const parsePDF = async (file: File): Promise<any[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer,
      standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/'
    }).promise;
    
    const products: any[] = [];
    
    // Extract text from all pages with position information
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sort items by Y position, then X position for better text flow
      const sortedItems = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .sort((a: any, b: any) => {
          const yDiff = Math.abs(a.transform[5] - b.transform[5]);
          if (yDiff < 2) { // Same line
            return a.transform[4] - b.transform[4]; // Sort by X
          }
          return b.transform[5] - a.transform[5]; // Sort by Y (top to bottom)
        });

      const pageText = sortedItems.map((item: any) => item.str).join(' ');
      
      // Process this specific format
      const pageProducts = parseSpecificPDFFormat(pageText, pageNum, file.name);
      products.push(...pageProducts);
    }

    return products;
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Specific parser for your PDF format
const parseSpecificPDFFormat = (text: string, pageNumber: number, filename: string): any[] => {
  const products: any[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let headerFound = false;
  let headerPattern: RegExp | null = null;
  
  // Define expected column patterns for your format
  const expectedColumns = ['e-code', 'dcat', 'sap', 'stock', 'inr price per piece', 'min. order quantity'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const lowerLine = line.toLowerCase();
    
    // Detect header row with your specific columns
    if (!headerFound) {
      const headerMatches = expectedColumns.filter(col => 
        lowerLine.includes(col) || lowerLine.includes(col.replace(/\s+/g, ''))
      );
      
      if (headerMatches.length >= 4) { // At least 4 columns should match
        headerFound = true;
        console.log(`Found header on page ${pageNumber}:`, line);
        continue;
      }
    }
    
    // Process data rows after header is found
    if (headerFound) {
      // Pattern 1: Standard format with all columns
      // E-Code DCAT SAP Stock Price MinOrder
      const pattern1 = /^([A-Z0-9]+(?:[.\-][A-Z0-9]+)*)\s+(\d+)\s+([A-Z0-9]*)\s+([○●]|\d+)\s+([\d,]+\.?\d*)\s+(\d+)$/;
      
      // Pattern 2: Format with bullet separator
      // E-Code DCAT • Price MinOrder
      const pattern2 = /^([A-Z0-9]+(?:[.\-][A-Z0-9]+)*)\s+(\d+)\s+•\s+([\d,]+\.?\d*)\s+(\d+)$/;
      
      // Pattern 3: Compact format
      // E-Code DCAT Price MinOrder (without stock/sap)
      const pattern3 = /^([A-Z0-9]+(?:[.\-][A-Z0-9]+)*)\s+(\d+)\s+([\d,]+\.?\d*)\s+(\d+)$/;
      
      // Pattern 4: Extended format with description
      // E-Code Description DCAT SAP Stock Price MinOrder  
      const pattern4 = /^([A-Z0-9]+(?:[.\-][A-Z0-9]+)*)\s+(.+?)\s+(\d+)\s+([A-Z0-9]*)\s+([○●]|\d+)\s+([\d,]+\.?\d*)\s+(\d+)$/;
      
      let match = null;
      let patternUsed = '';
      
      // Try patterns in order of specificity
      if ((match = line.match(pattern1))) {
        patternUsed = 'Pattern 1 (Full format)';
        products.push({
          eCode: match[1].trim(),
          dcat: match[2].trim(),
          sap: match[3].trim() || null,
          stock: match[4].trim(),
          price: parseFloat(match[5].replace(/,/g, '')),
          minOrderQty: parseInt(match[6]),
          source: 'PDF',
          filename,
          pageNumber,
          pattern: patternUsed
        });
      } else if ((match = line.match(pattern2))) {
        patternUsed = 'Pattern 2 (Bullet format)';
        products.push({
          eCode: match[1].trim(),
          dcat: match[2].trim(),
          price: parseFloat(match[3].replace(/,/g, '')),
          minOrderQty: parseInt(match[4]),
          source: 'PDF',
          filename,
          pageNumber,
          pattern: patternUsed
        });
      } else if ((match = line.match(pattern3))) {
        patternUsed = 'Pattern 3 (Compact format)';
        products.push({
          eCode: match[1].trim(),
          dcat: match[2].trim(),
          price: parseFloat(match[3].replace(/,/g, '')),
          minOrderQty: parseInt(match[4]),
          source: 'PDF',
          filename,
          pageNumber,
          pattern: patternUsed
        });
      } else if ((match = line.match(pattern4))) {
        patternUsed = 'Pattern 4 (With description)';
        products.push({
          eCode: match[1].trim(),
          description: match[2].trim(),
          dcat: match[3].trim(),
          sap: match[4].trim() || null,
          stock: match[5].trim(),
          price: parseFloat(match[6].replace(/,/g, '')),
          minOrderQty: parseInt(match[7]),
          source: 'PDF',
          filename,
          pageNumber,
          pattern: patternUsed
        });
      }
      
      // Advanced parsing for table-like structures
      else if (line.includes('\t') || /\s{3,}/.test(line)) {
        const columns = line.split(/\s{3,}|\t/).filter(col => col.trim());
        
        if (columns.length >= 4) {
          // Try to map columns based on position and content
          const product: any = {
            source: 'PDF',
            filename,
            pageNumber,
            pattern: 'Tabular format'
          };
          
          // First column is usually E-Code
          if (columns[0] && /^[A-Z0-9]+/.test(columns[0])) {
            product.eCode = columns[0].trim();
          }
          
          // Look for DCAT (numeric)
          for (let j = 1; j < columns.length; j++) {
            if (/^\d{1,3}$/.test(columns[j])) {
              product.dcat = columns[j].trim();
              break;
            }
          }
          
          // Look for price (contains decimal or comma)
          for (let j = 0; j < columns.length; j++) {
            if (/[\d,]+\.?\d*/.test(columns[j]) && !product.price) {
              const priceStr = columns[j].replace(/,/g, '');
              if (!isNaN(parseFloat(priceStr))) {
                product.price = parseFloat(priceStr);
              }
            }
          }
          
          // Look for minimum order quantity (usually last numeric column)
          for (let j = columns.length - 1; j >= 0; j--) {
            if (/^\d+$/.test(columns[j]) && columns[j] !== product.dcat) {
              product.minOrderQty = parseInt(columns[j]);
              break;
            }
          }
          
          // Look for stock indicators
          for (let j = 0; j < columns.length; j++) {
            if (/^[○●]$/.test(columns[j])) {
              product.stock = columns[j];
              break;
            }
          }
          
          // Add product if it has essential data
          if (product.eCode && (product.price || product.dcat)) {
            products.push(product);
          }
        }
      }
    }
    
    // Also look for discount category information
    const dcatMatch = line.match(/discount\s+categor(?:y|ies)\s*\(?\s*dcat\s*\)?[:\s]*(\d+)/i);
    if (dcatMatch) {
      // If we have recent products without DCAT, apply this DCAT to them
      const recentProducts = products.slice(-5); // Last 5 products
      recentProducts.forEach(product => {
        if (!product.dcat && product.pageNumber === pageNumber) {
          product.dcat = dcatMatch[1];
          product.dcatSource = 'Page header/footer';
        }
      });
    }
  }
  
  return products;
};

// Enhanced validation for your specific format
export const validateSpecificPDFData = (products: any[], filename: string): {
  valid: any[];
  invalid: any[];
  warnings: string[];
} => {
  const valid: any[] = [];
  const invalid: any[] = [];
  const warnings: string[] = [];

  products.forEach((product, index) => {
    const issues: string[] = [];
    
    // Validate E-Code (required)
    if (!product.eCode || !/^[A-Z0-9]+/.test(product.eCode)) {
      issues.push('Invalid or missing E-Code');
    }
    
    // Validate DCAT (should be numeric)
    if (product.dcat && !/^\d+$/.test(product.dcat.toString())) {
      issues.push('DCAT should be numeric');
    }
    
    // Validate price (required, should be positive number)
    if (!product.price || isNaN(Number(product.price)) || Number(product.price) <= 0) {
      issues.push('Invalid or missing price');
    }
    
    // Validate minimum order quantity
    if (product.minOrderQty && (!Number.isInteger(Number(product.minOrderQty)) || Number(product.minOrderQty) <= 0)) {
      issues.push('Minimum order quantity should be a positive integer');
    }
    
    // Validate stock format
    if (product.stock && !['○', '●'].includes(product.stock) && isNaN(Number(product.stock))) {
      warnings.push(`${filename}, Page ${product.pageNumber}, Row ${index + 1}: Stock format unusual (${product.stock})`);
    }
    
    if (issues.length > 0) {
      invalid.push({ ...product, _issues: issues, _row: index + 1 });
      warnings.push(`${filename}, Page ${product.pageNumber}, Row ${index + 1}: ${issues.join(', ')}`);
    } else {
      // Normalize the valid product
      const normalizedProduct = {
        ...product,
        productId: product.eCode,
        name: product.description || product.eCode,
        category: product.dcat ? `DCAT-${product.dcat}` : 'Uncategorized',
        companyName: 'Dormer Pramet', // Based on your previous examples
        shopName: 'Default Shop'
      };
      valid.push(normalizedProduct);
    }
  });

  return { valid, invalid, warnings };
};
