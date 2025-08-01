import React, { useState, useEffect } from 'react';
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import { useApp } from '../context/AppContext';

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
  quantity?: number;
  discount?: number;
}

const CartBillSection: React.FC<{ cart: SearchResult[], isDark: boolean }> = ({ cart, isDark }) => {
  let subTotal = 0, totalDiscount = 0;

  for (const item of cart) {
    const qty = Number(item.quantity || item.moq || 1);
    const price = Number(item.price);
    const discount = Number(item.discount) || 0;

    if (isNaN(price) || isNaN(qty)) continue;

    const itemTotal = qty * price;
    const itemDiscount = itemTotal * (discount / 100);

    subTotal += itemTotal;
    totalDiscount += itemDiscount;
  }

  const finalTotal = subTotal - totalDiscount;

  return (
    <div className={`p-4 rounded-lg mt-4 ${isDark ? 'bg-gray-800 text-white' : 'bg-blue-50 text-gray-900'}`}>
      <h4 className="text-lg font-medium mb-2">🧾 Bill Summary</h4>
      <div className="flex flex-col gap-1">
        <span>Subtotal: <b>₹{subTotal.toFixed(2)}</b></span>
        <span>Total Discount: <b>-₹{totalDiscount.toFixed(2)}</b></span>
        <span className="text-blue-600 font-bold text-lg">
          Total to Pay: ₹{finalTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

const Companies: React.FC = () => {
  const { state } = useApp();
  const isDark = state.theme === 'dark';

  const [pdfText, setPdfText] = useState(() => sessionStorage.getItem("pdfText") || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>(() => {
    const stored = sessionStorage.getItem("results");
    return stored ? JSON.parse(stored) : [];
  });
  const [cart, setCart] = useState<SearchResult[]>(() => {
    const stored = sessionStorage.getItem("cart");
    return stored ? JSON.parse(stored) : [];
  });

  const [isPdfLoaded, setIsPdfLoaded] = useState(() => {
    return !!sessionStorage.getItem("pdfText");
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("pdfText", pdfText);
    sessionStorage.setItem("results", JSON.stringify(results));
    sessionStorage.setItem("cart", JSON.stringify(cart));
  }, [pdfText, results, cart]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    const reader = new FileReader();

    setPdfText('');
    setResults([]);
    setCart([]);
    sessionStorage.removeItem("pdfText");
    sessionStorage.removeItem("results");
    sessionStorage.removeItem("cart");
    setLoading(true);
    setIsPdfLoaded(false);

    reader.onload = async () => {
      try {
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
        setIsPdfLoaded(true);
      } catch (err) {
        console.error("PDF Parse Error:", err);
        alert("Failed to parse PDF.");
      } finally {
        setLoading(false);
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
        const [_, ecode, dcat, sap, priceRaw, moqRaw] = match;

        const price = parseFloat(priceRaw.replace(/[^\d.]/g, "")) || 0;
        const moq = parseInt(moqRaw.replace(/[^\d]/g, "")) || 1;

        matches.push({
          ecode,
          dcat,
          sap,
          price: price.toFixed(2),
          moq: moq.toString()
        });
      }
    }

    setResults(matches);
  };

  const handleAddToCart = (item: SearchResult) => {
    const exists = cart.some((c) => c.ecode === item.ecode);
    if (!exists) {
      setCart((prev) => [
        ...prev,
        {
          ...item,
          quantity: Number(item.moq) || 1,
          discount: 0,
        },
      ]);
    }
  };

  return (
    <div className={`p-6 rounded-lg shadow-md ${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <h2 className="text-2xl font-bold mb-6">🔍 Companies PDF Search</h2>

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
        {loading ? (
          <p className="mt-2 text-yellow-500 text-sm">📄 File is uploading, please wait...</p>
        ) : (
          isPdfLoaded && !pdfText.startsWith("data:") && (
            <p className="mt-2 text-green-500 text-sm">✅ PDF already loaded from session</p>
          )
        )}
      </div>

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

      <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
        <h3 className="text-lg font-semibold mb-4">Search Results:</h3>
        {results.length === 0 ? (
          <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {isPdfLoaded ? 'No results found. Try a different search term.' : 'Upload a PDF and search to see results here.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`min-w-full border rounded-lg ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <thead className={isDark ? 'bg-gray-600' : 'bg-gray-100'}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">e-Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">DCAT SAP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">INR Price / Piece</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Min. Order Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-600' : 'divide-gray-200'}`}>
                {results.map((row, idx) => (
                  <tr key={idx} className={`hover:${isDark ? 'bg-gray-600' : 'bg-gray-50'} transition-colors`}>
                    <td className="px-4 py-3 text-sm font-medium">{row.ecode}</td>
                    <td className="px-4 py-3 text-sm">{row.dcat}</td>
                    <td className="px-4 py-3 text-sm">{row.sap}</td>
                    <td className="px-4 py-3 text-sm">₹{row.price}</td>
                    <td className="px-4 py-3 text-sm">{row.moq}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleAddToCart(row)}
                        className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white hover:bg-green-600"
                      >
                        Add to Cart
                      </button>
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

      {cart.length > 0 && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-semibold mb-2">🛒 Cart</h3>
          <div className="overflow-x-auto mb-4">
            <table className={`min-w-full border rounded-lg ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <thead className={isDark ? 'bg-gray-600' : 'bg-gray-100'}>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">e-Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">DCAT</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Price (₹)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">MOQ</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Quantity</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Discount (%)</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase">Total (₹)</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-600' : 'divide-gray-200'}`}>
                {cart.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">{item.ecode}</td>
                    <td className="px-4 py-2">{item.dcat}</td>
                    <td className="px-4 py-2">{Number(item.price).toFixed(2)}</td>
                    <td className="px-4 py-2">{item.moq}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={parseInt(item.moq) || 1}
                        value={item.quantity || item.moq || 1}
                        className={`w-16 rounded border px-1 py-0.5 ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        onChange={e => {
                          const qty = Math.max(Number(e.target.value), parseInt(item.moq) || 1);
                          setCart(prev =>
                            prev.map((c, j) =>
                              j === idx ? { ...c, quantity: qty } : c
                            )
                          );
                        }}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount || 0}
                        className={`w-14 rounded border px-1 py-0.5 ${isDark ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        onChange={e => {
                          let dis = Math.max(0, Math.min(100, Number(e.target.value)));
                          setCart(prev =>
                            prev.map((c, j) =>
                              j === idx ? { ...c, discount: dis } : c
                            )
                          );
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      {(() => {
                        const qty = Number(item.quantity || item.moq || 1);
                        const price = Number(item.price);
                        const discount = Number(item.discount) || 0;

                        if (isNaN(price) || isNaN(qty)) return "₹0.00";

                        const total = qty * price * (1 - discount / 100);
                        return `₹${total.toFixed(2)}`;
                      })()}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() =>
                          setCart(prev =>
                            prev.filter((_, j) => j !== idx)
                          )
                        }
                        className="px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CartBillSection cart={cart} isDark={isDark} />
        </div>
      )}
    </div>
  );
};

export default Companies;