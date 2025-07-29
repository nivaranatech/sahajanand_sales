import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseCSV, parseExcel, parsePDF } from '../utils/fileParser';

export default function FileUpload() {
  const { state, dispatch } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    skipped: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

// Update the validateExcelFormat function to make some fields optional
const validateExcelFormat = (products: any[], filename: string) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (products.length === 0) {
    errors.push(`${filename}: File is empty`);
    return { errors, warnings };
  }

  const firstRow = products[0];
  const availableHeaders = Object.keys(firstRow).map(h => h.toLowerCase());
  
  // Check for at least price column (minimum requirement)
  const hasPriceColumn = availableHeaders.some(header => 
    ['price', 'cost', 'inr', 'amount'].some(pattern => header.includes(pattern))
  );
  
  if (!hasPriceColumn) {
    errors.push(`${filename}: Must contain at least a price column`);
    return { errors, warnings };
  }

  // Warn about missing optional columns
  const optionalChecks = [
    { name: 'Category', patterns: ['taper', 'categories', 'category', 'type'] },
    { name: 'Description', patterns: ['description', 'name', 'product name', 'title'] },
    { name: 'Article Number', patterns: ['catalogue', 'article', 'part', 'number', 'code', 'sku'] }
  ];

  optionalChecks.forEach(check => {
    const hasColumn = check.patterns.some(pattern => 
      availableHeaders.some(header => header.includes(pattern))
    );
    if (!hasColumn) {
      warnings.push(`${filename}: Missing optional column: ${check.name}. Products will use default values.`);
    }
  });

  return { errors, warnings };
};


  const normalizeProduct = (product: any) => {
    const normalized: any = {};
    
    // Map fields based on your Excel structure
    const fieldMappings = {
      category: ['taper', 'categories', 'taper/ categories'],
      description: ['description', 'bezeichnung', 'designation'],
      catalogueNo: [
        'catalogue article no.', 
        'catalogue article no', 
        'article no.',
        'catalogue no.'
      ],
      obiArticleNo: ['obi article no.', 'obi article no', 'obi no.'],
      price: ['unit price in inr', 'unit price', 'price', 'inr price per piece'],
      stock: ['stock', 'quantity', 'qty'],
      eCode: ['e-code', 'ecode'],
      dcat: ['dcat'],
      sap: ['sap'],
      minOrderQty: ['min. order quantity', 'min order quantity', 'moq']
    };

    // Map known fields
    Object.entries(fieldMappings).forEach(([normalizedKey, possibleKeys]) => {
      const sourceKey = Object.keys(product).find(key => 
        possibleKeys.some(pk => key.toLowerCase().includes(pk.toLowerCase()))
      );
      if (sourceKey && product[sourceKey] !== undefined && product[sourceKey] !== '') {
        normalized[normalizedKey] = product[sourceKey];
      }
    });

    // Handle price tiers (1.0, 2.0, 3.0, 6.0, 11.0 columns from your Excel)
    const priceTiers: any = {};
    Object.keys(product).forEach(key => {
      if (/^\d+\.0$/.test(key)) {
        const tierValue = product[key];
        if (tierValue && !isNaN(Number(tierValue)) && Number(tierValue) > 0) {
          priceTiers[key] = Number(tierValue);
        }
      }
    });
    
    if (Object.keys(priceTiers).length > 0) {
      normalized.priceTiers = priceTiers;
    }

    // Copy any remaining fields that weren't mapped
    Object.keys(product).forEach(key => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!Object.values(fieldMappings).flat().some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        normalized[normalizedKey] = product[key];
      }
    });

    // Generate a unique ID if not present
    if (!normalized.productId && !normalized.eCode && !normalized.catalogueNo) {
      normalized.productId = `${normalized.category || 'UNKNOWN'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } else {
      normalized.productId = normalized.eCode || normalized.catalogueNo || normalized.productId;
    }

    // Ensure required fields have values
    normalized.name = normalized.description || normalized.catalogueNo || 'Unknown Product';
    normalized.companyName = 'Dormer Pramet'; // Based on your PDF file
    normalized.shopName = state.user?.shopName || 'Default Shop';

    return normalized;
  };

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) {
      setUploadResults({
        success: 0,
        skipped: 0,
        errors: ['No files selected for upload'],
        warnings: []
      });
      return;
    }

    setUploading(true);
    setUploadResults(null);
    
    let totalSuccess = 0;
    let totalSkipped = 0;
    let allErrors: string[] = [];
    let allWarnings: string[] = [];

    for (const file of Array.from(files)) {
      try {
        // Validate file type - Excel only for this specific format
        if (!file.name.match(/\.(xls|xlsx)$/i)) {
          allErrors.push(`${file.name}: Unsupported file format. Only Excel files (.xls, .xlsx) are allowed.`);
          continue;
        }

        // Check file size (Max 10MB for Excel files)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          allErrors.push(`${file.name}: File too large. Maximum size is 10MB.`);
          continue;
        }

        // Parse Excel file
        let products;
        try {
          products = await parseExcel(file);
        } catch (parseError) {
          allErrors.push(`${file.name}: Failed to parse file - ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          continue;
        }

        // Validate products with the new Excel format validation
        const { errors, warnings } = validateExcelFormat(products, file.name);
        if (errors.length > 0) {
          allErrors.push(...errors);
          allWarnings.push(...warnings);
          continue;
        }

        // Normalize and process products
        const normalizedProducts = products.map(normalizeProduct);
        const existingIds = new Set(state.products.map(p => p.productId));
        const newProducts = normalizedProducts.filter(p => !existingIds.has(p.productId));
        const skippedCount = normalizedProducts.length - newProducts.length;

        if (newProducts.length > 0) {
          // Use the correct payload structure that matches AppContext
          dispatch({ 
            type: 'ADD_PRODUCTS', 
            payload: { 
              products: newProducts, 
              fileName: file.name 
            } 
          });
        }
        
        totalSuccess += newProducts.length;
        totalSkipped += skippedCount;
        allWarnings.push(...warnings);
        
        if (skippedCount > 0) {
          allWarnings.push(`${file.name}: ${skippedCount} products skipped (duplicates)`);
        }
        
      } catch (error) {
        allErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown processing error'}`);
      }
    }

    setUploadResults({
      success: totalSuccess,
      skipped: totalSkipped,
      errors: allErrors,
      warnings: allWarnings
    });
    setUploading(false);
  }, [state.products, state.user, dispatch]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const resetUpload = useCallback(() => {
    setUploadResults(null);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${
          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Excel File Upload
        </h1>
        <p className={`mt-2 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Upload Excel files (.xls, .xlsx) to import product data in the specified format.
        </p>
      </div>

      <div className={`p-6 rounded-xl border ${
        state.theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : state.theme === 'dark'
                ? 'border-gray-600 hover:border-gray-500'
                : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".xls,.xlsx"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          
          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="animate-spin mx-auto w-12 h-12 text-blue-500" />
              <p className={`text-lg font-medium ${
                state.theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Processing Excel files...
              </p>
              <p className={`text-sm ${
                state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Please wait while we validate and import your data
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <FileSpreadsheet className={`w-12 h-12 ${
                  dragActive ? 'text-green-500' : state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
              <div>
                <p className={`text-lg font-medium ${
                  state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {uploadResults ? 'Drag new Excel files here' : 'Drop your Excel files here, or click to browse'}
                </p>
                <p className={`text-sm mt-1 ${
                  state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Supports .xls and .xlsx files only (Max 10MB)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Format Guide */}
        <div className="mt-6">
          <h3 className={`text-lg font-semibold mb-3 ${
            state.theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Required Excel Format
          </h3>
          
          <div className={`p-4 rounded-lg ${
            state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-start space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className={`font-medium ${
                  state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Required Excel Columns:
                </p>
                <ul className={`text-sm space-y-1 ${
                  state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <li>• <span className="font-semibold text-red-500">*</span> <span className="font-semibold">Taper/Categories</span> - Product category</li>
                  <li>• <span className="font-semibold text-red-500">*</span> <span className="font-semibold">Description</span> - Product description</li>
                  <li>• <span className="font-semibold text-red-500">*</span> <span className="font-semibold">Bezeichnung/Designation</span> - German description</li>
                  <li>• <span className="font-semibold text-red-500">*</span> <span className="font-semibold">Catalogue Article No.</span> - Part number</li>
                  <li>• <span className="font-semibold">OBI Article No.</span> - OBI-specific part number</li>
                  <li>• <span className="font-semibold text-red-500">*</span> <span className="font-semibold">Unit Price in INR</span> - Base price</li>
                  <li>• <span className="font-semibold">Stock</span> - Availability (○/●/number)</li>
                </ul>
                <p className={`text-xs pt-2 ${
                  state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <span className="text-red-500">*</span> Required fields
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className={`mt-4 p-3 rounded-lg ${
            state.theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${
              state.theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
            }`}>
              <strong>Price Tiers:</strong> Excel files with multiple price columns (1.0, 2.0, 3.0, etc.) will be automatically detected and imported as price tiers for bulk pricing.
            </p>
          </div>
        </div>

        {/* Upload Results */}
        {uploadResults && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className={`text-lg font-semibold ${
                state.theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Import Results
              </h3>
              <button
                onClick={resetUpload}
                className={`text-sm px-3 py-1 rounded-md ${
                  state.theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Clear Results
              </button>
            </div>

            {uploadResults.success > 0 && (
              <div className="flex items-start space-x-2 text-emerald-600">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Successfully imported {uploadResults.success} product{uploadResults.success !== 1 ? 's' : ''}</span>
              </div>
            )}
            
            {uploadResults.skipped > 0 && (
              <div className="flex items-start space-x-2 text-yellow-600">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>Skipped {uploadResults.skipped} duplicate product{uploadResults.skipped !== 1 ? 's' : ''}</span>
              </div>
            )}
            
            {uploadResults.warnings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-start space-x-2 text-yellow-600">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Warnings ({uploadResults.warnings.length}):</span>
                </div>
                <ul className={`ml-7 text-sm space-y-1 max-h-32 overflow-y-auto ${
                  state.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                }`}>
                  {uploadResults.warnings.slice(0, 10).map((warning, index) => (
                    <li key={`warning-${index}`}>• {warning}</li>
                  ))}
                  {uploadResults.warnings.length > 10 && (
                    <li>• And {uploadResults.warnings.length - 10} more warnings...</li>
                  )}
                </ul>
              </div>
            )}
            
            {uploadResults.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-start space-x-2 text-red-600">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Errors ({uploadResults.errors.length}):</span>
                </div>
                <ul className={`ml-7 text-sm space-y-1 max-h-32 overflow-y-auto ${
                  state.theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>
                  {uploadResults.errors.slice(0, 10).map((error, index) => (
                    <li key={`error-${index}`}>• {error}</li>
                  ))}
                  {uploadResults.errors.length > 10 && (
                    <li>• And {uploadResults.errors.length - 10} more errors...</li>
                  )}
                </ul>
                <div className={`mt-2 p-3 rounded-lg ${
                  state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Please correct the errors in your Excel file and try again. Ensure all required fields are present and contain valid values.
                  </p>
                </div>
              </div>
            )}

            {uploadResults.success === 0 && 
             uploadResults.skipped === 0 && 
             uploadResults.errors.length === 0 && (
              <div className="flex items-start space-x-2 text-blue-600">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>No products were imported. The file may be empty or contain no new products.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
