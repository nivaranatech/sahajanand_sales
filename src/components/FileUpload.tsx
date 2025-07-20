import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseCSV, parseExcel } from '../utils/fileParser';

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

  // Required fields with their possible column names
  const requiredFields = [
    { names: ['productid', 'id', 'product id'], key: 'productId' },
    { names: ['productname', 'name', 'product name'], key: 'name' },
    { names: ['quantity', 'qty', 'stock'], key: 'quantity' },
    { names: ['companyname', 'company', 'manufacturer'], key: 'companyName' },
    { names: ['shopname', 'shop', 'store'], key: 'shopName' },
    { names: ['price', 'amount', 'cost', 'originalprice'], key: 'price' }
  ];

  const validateProducts = (products: any[], filename: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (products.length === 0) {
      errors.push(`${filename}: File is empty`);
      return { errors, warnings };
    }

    products.forEach((product, index) => {
      // Check for missing required fields
      requiredFields.forEach(field => {
        const hasField = Object.keys(product).some(key => 
          field.names.includes(key.toLowerCase())
        );
        if (!hasField) {
          errors.push(`${filename}, Row ${index + 1}: Missing required field (${field.names[0]})`);
        }
      });

      // Validate data types and values
      const quantity = product.quantity || product.qty || product.stock;
      if (quantity && isNaN(Number(quantity))) {
        errors.push(`${filename}, Row ${index + 1}: Quantity must be a number (found: ${quantity})`);
      } else if (quantity && Number(quantity) < 0) {
        warnings.push(`${filename}, Row ${index + 1}: Quantity is negative`);
      }

      const price = product.price || product.amount || product.cost || product.originalprice;
      if (price && isNaN(Number(price))) {
        errors.push(`${filename}, Row ${index + 1}: Price must be a number (found: ${price})`);
      } else if (price && Number(price) < 0) {
        warnings.push(`${filename}, Row ${index + 1}: Price is negative`);
      }

      // Check for empty required values
      const productId = product.productId || product.id;
      if (!productId || productId.toString().trim() === '') {
        errors.push(`${filename}, Row ${index + 1}: Product ID cannot be empty`);
      }

      const productName = product.productName || product.name;
      if (!productName || productName.toString().trim() === '') {
        errors.push(`${filename}, Row ${index + 1}: Product Name cannot be empty`);
      }
    });

    return { errors, warnings };
  };

  const normalizeProduct = (product: any) => {
    const normalized: any = {};
    
    // Map required fields
    requiredFields.forEach(field => {
      const sourceKey = Object.keys(product).find(key => 
        field.names.includes(key.toLowerCase())
      );
      if (sourceKey) {
        normalized[field.key] = product[sourceKey];
      }
    });

    // Copy all other fields
    Object.keys(product).forEach(key => {
      if (!requiredFields.some(f => f.names.includes(key.toLowerCase()))) {
        normalized[key] = product[key];
      }
    });

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
        // Validate file type
        if (!file.name.match(/\.(csv|xls|xlsx)$/i)) {
          allErrors.push(`${file.name}: Unsupported file format. Only CSV, XLS, and XLSX files are allowed.`);
          continue;
        }

        // Parse file
        let products;
        try {
          if (file.name.toLowerCase().endsWith('.csv')) {
            const content = await file.text();
            products = parseCSV(content);
          } else {
            products = await parseExcel(file);
          }
        } catch (parseError) {
          allErrors.push(`${file.name}: Failed to parse file - ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
          continue;
        }

        // Validate products
        const { errors, warnings } = validateProducts(products, file.name);
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
          dispatch({ type: 'ADD_PRODUCTS', payload: newProducts });
        }
        
        totalSuccess += newProducts.length;
        totalSkipped += skippedCount;
        allWarnings.push(...warnings);
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
  }, [state.products, dispatch]);

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
          File Upload
        </h1>
        <p className={`mt-2 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Upload Excel or CSV files to import product data into the system.
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
            accept=".csv,.xls,.xlsx"
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
                Processing files...
              </p>
              <p className={`text-sm ${
                state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Please wait while we validate and import your data
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className={`w-12 h-12 mx-auto ${
                dragActive ? 'text-blue-500' : state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <div>
                <p className={`text-lg font-medium ${
                  state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {uploadResults ? 'Drag new files here' : 'Drop your files here, or click to browse'}
                </p>
                <p className={`text-sm mt-1 ${
                  state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Supports .csv, .xls, and .xlsx files (Max 10MB each)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Supported Format Guide */}
        <div className="mt-6">
          <h3 className={`text-lg font-semibold mb-3 ${
            state.theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            File Requirements
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
                  Required columns (case-insensitive):
                </p>
                <ul className={`text-sm space-y-1 ${
                  state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <li>• <span className="font-semibold">Product ID</span> (or ID) - Unique identifier</li>
                  <li>• <span className="font-semibold">Product Name</span> (or Name) - Text</li>
                  <li>• <span className="font-semibold">Quantity</span> (or Qty, Stock) - Number ≥ 0</li>
                  <li>• <span className="font-semibold">Company Name</span> (or Company) - Text</li>
                  <li>• <span className="font-semibold">Shop Name</span> (or Shop) - Text</li>
                  <li>• <span className="font-semibold">Price</span> (or Amount, Cost) - Number ≥ 0</li>
                </ul>
                <p className={`text-sm pt-2 ${
                  state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Optional: Category, Description, GST/Tax, Discount
                </p>
              </div>
            </div>
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
                <ul className={`ml-7 text-sm space-y-1 ${
                  state.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                }`}>
                  {uploadResults.warnings.slice(0, 5).map((warning, index) => (
                    <li key={`warning-${index}`}>• {warning}</li>
                  ))}
                  {uploadResults.warnings.length > 5 && (
                    <li>• And {uploadResults.warnings.length - 5} more warnings...</li>
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
                <ul className={`ml-7 text-sm space-y-1 ${
                  state.theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>
                  {uploadResults.errors.slice(0, 5).map((error, index) => (
                    <li key={`error-${index}`}>• {error}</li>
                  ))}
                  {uploadResults.errors.length > 5 && (
                    <li>• And {uploadResults.errors.length - 5} more errors...</li>
                  )}
                </ul>
                <div className={`mt-2 p-3 rounded-lg ${
                  state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Please correct the errors in your file and try again. Ensure all required fields are present and contain valid values.
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