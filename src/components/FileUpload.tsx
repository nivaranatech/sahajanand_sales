import React, { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
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
  } | null>(null);

  const handleFiles = useCallback(async (files: FileList) => {
    setUploading(true);
    setUploadResults(null);
    
    let totalSuccess = 0;
    let totalSkipped = 0;
    let allErrors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        if (!file.name.match(/\.(csv|xls|xlsx)$/i)) {
          allErrors.push(`${file.name}: Unsupported file format`);
          continue;
        }

        let products;
        if (file.name.toLowerCase().endsWith('.csv')) {
          const content = await file.text();
          products = parseCSV(content);
        } else {
          products = await parseExcel(file);
        }

        const existingIds = new Set(state.products.map(p => p.productId));
        const newProducts = products.filter(p => !existingIds.has(p.productId));
        const skippedCount = products.length - newProducts.length;

        dispatch({ type: 'ADD_PRODUCTS', payload: newProducts });
        
        totalSuccess += newProducts.length;
        totalSkipped += skippedCount;
      } catch (error) {
        allErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setUploadResults({
      success: totalSuccess,
      skipped: totalSkipped,
      errors: allErrors
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
              <div className="animate-spin mx-auto w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <p className={`text-lg font-medium ${
                state.theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Processing files...
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
                  Drop your files here, or click to browse
                </p>
                <p className={`text-sm mt-1 ${
                  state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Supports .csv, .xls, and .xlsx files
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
            Supported File Format
          </h3>
          <div className={`p-4 rounded-lg ${
            state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex items-start space-x-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div>
                <p className={`font-medium ${
                  state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Required columns (case-insensitive):
                </p>
                <ul className={`mt-2 text-sm space-y-1 ${
                  state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <li>• Product ID (or ID)</li>
                  <li>• Product Name (or Name)</li>
                  <li>• Quantity (or Qty, Stock)</li>
                  <li>• Company Name (or Company)</li>
                  <li>• Shop Name (or Shop)</li>
                  <li>• Price (or Amount, Cost)</li>
                </ul>
                <p className={`mt-2 text-sm ${
                  state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Optional: Category, GST/Tax, Description
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Results */}
        {uploadResults && (
          <div className="mt-6 space-y-3">
            {uploadResults.success > 0 && (
              <div className="flex items-center space-x-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" />
                <span>Successfully imported {uploadResults.success} products</span>
              </div>
            )}
            {uploadResults.skipped > 0 && (
              <div className="flex items-center space-x-2 text-yellow-600">
                <AlertCircle className="w-5 h-5" />
                <span>Skipped {uploadResults.skipped} duplicate products</span>
              </div>
            )}
            {uploadResults.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span>Errors encountered:</span>
                </div>
                <ul className={`ml-7 text-sm space-y-1 ${
                  state.theme === 'dark' ? 'text-red-400' : 'text-red-600'
                }`}>
                  {uploadResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}