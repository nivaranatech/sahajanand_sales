import React, { useState } from 'react';
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import { useApp } from '../context/AppContext';

// Tell PDF.js to use the worker that Vite will bundle internally
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export interface Company {
  name: string;
  productCount: number;
  totalSales: number;
}

interface SearchResult {
  ecode: string;
  dcat: string;
  sap: string;
  price: string;
  moq: string;
}

const Companies: React.FC = () => {
  const { state } = useApp();
  
  // PDF search states
  const [pdfText, setPdfText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPdfLoaded, setIsPdfLoaded] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        setIsPdfLoaded(false);

        const typedArray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;

        let allText = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();

          let pageText = content.items
            .map((item: any) => item.str.trim())
            .filter((str: string) => str.length > 0)
            .join(" ");

          allText += pageText + "\n";
        }

        setPdfText(allText);
        setResults([]);
        setIsPdfLoaded(true);
      } catch (err) {
        console.error("PDF Parse Error:", err);
        alert("Failed to parse PDF.");
        setIsPdfLoaded(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      alert("Enter a search keyword");
      return;
    }

    const pattern = new RegExp(
      `(${searchTerm.trim()})\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)\\s+(\\S+)`,
      "i"
    );

    const matches: SearchResult[] = [];
    const lines = pdfText.split("\n");

    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        matches.push({
          ecode: match[1],
          dcat: match[2],
          sap: match[3],
          price: match[4],
          moq: match[5],
        });
      }
    }

    setResults(matches);
  };

  const isDark = state.theme === 'dark';

  return (
    <div className={`p-6 rounded-lg shadow-md ${
      isDark 
        ? 'bg-gray-800 text-white' 
        : 'bg-white text-gray-900'
    }`}>
      <h2 className="text-2xl font-bold mb-6">🔍 Companies PDF Search</h2>
      
      {/* File Upload Section */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Upload Company PDF Document
        </label>
        <input 
          type="file" 
          accept="application/pdf" 
          onChange={handleFileUpload}
          className={`block w-full text-sm border rounded-lg cursor-pointer focus:outline-none ${
            isDark 
              ? 'bg-gray-700 border-gray-600 text-gray-400 file:bg-gray-600 file:text-white' 
              : 'bg-gray-50 border-gray-300 text-gray-900 file:bg-blue-50 file:text-blue-700'
          } file:border-0 file:py-2 file:px-4 file:rounded-l-lg file:cursor-pointer`}
        />
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter search keyword (e.g., company name or product code)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={!isPdfLoaded}
            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } ${!isPdfLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <button 
            onClick={handleSearch} 
            disabled={!isPdfLoaded}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              !isPdfLoaded 
                ? 'bg-gray-400 cursor-not-allowed' 
                : isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Search
          </button>
        </div>
        {!isPdfLoaded && (
          <p className="text-sm text-gray-500 mt-1">
            Please upload a PDF file first
          </p>
        )}
      </div>

      {/* Results Section */}
      <div className={`rounded-lg p-4 ${
        isDark ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <h3 className="text-lg font-semibold mb-4">Search Results:</h3>
        {results.length === 0 ? (
          <p className={`text-center py-8 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isPdfLoaded ? 'No results found. Try a different search term.' : 'Upload a PDF and search to see results here.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full border rounded-lg ${
              isDark ? 'border-gray-600' : 'border-gray-200'
            }`}>
              <thead className={isDark ? 'bg-gray-600' : 'bg-gray-100'}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    e-Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    DCAT SAP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    INR Price / Piece
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Min. Order Qty
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDark ? 'divide-gray-600' : 'divide-gray-200'
              }`}>
                {results.map((row, idx) => (
                  <tr key={idx} className={`hover:${
                    isDark ? 'bg-gray-600' : 'bg-gray-50'
                  } transition-colors`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {row.ecode}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.dcat}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.sap}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      ₹{row.price}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {row.moq}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {results.length > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default Companies;
