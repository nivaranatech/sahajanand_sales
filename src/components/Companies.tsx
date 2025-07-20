import React, { useState } from 'react';
import { Building2, FileText, Package, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Company, Product, Bill } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Helper function to normalize product data from different sources
const normalizeProduct = (product: any): Product => ({
  id: product.ProductID || product.id,
  name: product.ProductName || product.name,
  companyName: product.Company || product.companyName,
  shopName: product.ShopName || product.shopName,
  price: product.OriginalPrice || product.price,
  quantity: product.Quantity || product.quantity,
  discount: product.Discount || product.discount,
  category: product.Category || product.category
});

export default function Companies() {
  const { state } = useApp();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate item total for bills
  const calculateItemTotal = (item: { product: Product; quantity: number; discount: number; discountType: string }) => {
    const product = normalizeProduct(item.product);
    const basePrice = product.price * item.quantity;
    const discount = item.discountType === 'percentage' 
      ? (basePrice * item.discount) / 100 
      : item.discount;
    return basePrice - discount;
  };

  // Get unique companies with stats using normalized data
  const companies = Array.from(new Set(
    state.products.map(product => normalizeProduct(product).companyName)
  )).map(companyName => {
    const companyProducts = state.products.filter(p => 
      normalizeProduct(p).companyName === companyName
    );
    const companyBills = state.bills.flatMap(bill => 
      bill.items.filter(item => 
        normalizeProduct(item.product).companyName === companyName
      )
    );
    
    return {
      name: companyName,
      productCount: companyProducts.length,
      totalSales: companyBills.reduce((sum, item) => sum + calculateItemTotal(item), 0)
    };
  });

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateBillPDF = async (bill: Bill) => {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.width = '600px';
    element.style.padding = '20px';
    element.style.backgroundColor = 'white';
    element.style.color = 'black';
    
    element.innerHTML = `
      <div id="bill-content">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 24px; font-weight: bold;">ProductFlow</h2>
          <p style="color: #666;">Bill Receipt</p>
          <p style="font-size: 12px; color: #999;">
            ${new Date(bill.date).toLocaleDateString()} • ${bill.id}
          </p>
          ${bill.customerName ? `<p style="margin-top: 10px;">Customer: ${bill.customerName}</p>` : ''}
        </div>
        
        <div style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 10px 0; margin: 20px 0;">
          ${bill.items.map((item, index) => {
            const product = normalizeProduct(item.product);
            return `
            <div key=${index} style="display: flex; justify-content: space-between; padding: 8px 0;">
              <div>
                <p style="font-weight: 500;">${product.name}</p>
                <p style="font-size: 12px; color: #666;">
                  ${item.quantity} × ₹${product.price.toFixed(2)}
                </p>
              </div>
              <p>₹${calculateItemTotal(item).toFixed(2)}</p>
            </div>
            `;
          }).join('')}
        </div>
        
        <div style="text-align: right; margin-top: 20px;">
          <p>Subtotal: ₹${bill.subtotal.toFixed(2)}</p>
          ${bill.totalDiscount > 0 ? `<p>Discount: -$${bill.totalDiscount.toFixed(2)}</p>` : ''}
          <p>GST: ₹${bill.gst.toFixed(2)}</p>
          <p style="font-size: 18px; font-weight: bold; margin-top: 10px;">
            Total: ₹${bill.total.toFixed(2)}
          </p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #999;">
          <p>Thank you for your business!</p>
          <p style="margin-top: 5px;">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(element);
    
    try {
      const canvas = await html2canvas(element.querySelector('#bill-content') as HTMLElement);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`bill_${bill.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      document.body.removeChild(element);
    }
  };

  const companyBills = selectedCompany
    ? state.bills.filter(bill => 
        bill.items.some(item => 
          normalizeProduct(item.product).companyName === selectedCompany.name
        ))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${
          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Companies
        </h1>
        <p className={`mt-2 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {selectedCompany 
            ? `Products and bills for ${selectedCompany.name}` 
            : 'View all companies and their products'}
        </p>
      </div>

      {!selectedCompany ? (
        <>
          <div className={`relative rounded-xl border ${
            state.theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-0 ${
                state.theme === 'dark'
                  ? 'bg-gray-800 text-white placeholder-gray-400'
                  : 'bg-white text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company, index) => (
              <div 
                key={index}
                onClick={() => setSelectedCompany(company)}
                className={`p-6 rounded-xl border transition-all hover:scale-105 hover:shadow-lg cursor-pointer ${
                  state.theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 hover:shadow-gray-900/20'
                    : 'bg-white border-gray-200 hover:shadow-gray-200/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <Building2 className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {company.name}
                    </h3>
                    <div className={`text-sm ${
                      state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <p>{company.productCount} products</p>
                      <p>₹{company.totalSales.toFixed(2)} in sales</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedCompany(null)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              state.theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            ← Back to companies
          </button>

          <div className={`p-6 rounded-xl border ${
            state.theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              state.theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {selectedCompany.name} Products
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.products
                .filter(product => normalizeProduct(product).companyName === selectedCompany.name)
                .map((product, index) => {
                  const normalizedProduct = normalizeProduct(product);
                  return (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg ${
                        state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Package className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className={`font-medium ${
                            state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {normalizedProduct.name}
                          </p>
                          <p className={`text-sm ${
                            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            ₹{normalizedProduct.price.toFixed(2)} • {normalizedProduct.quantity} in stock
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className={`p-6 rounded-xl border ${
            state.theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              state.theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Sales Bills
            </h2>
            
            {companyBills.length > 0 ? (
              <div className="space-y-4">
                {companyBills.map((bill) => (
                  <div 
                    key={bill.id}
                    className={`p-4 rounded-lg ${
                      state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-medium ${
                          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          Bill #{bill.id.slice(-6)}
                        </p>
                        <p className={`text-sm ${
                          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {new Date(bill.date).toLocaleDateString()} • {bill.items.length} items
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className={`font-bold ${
                          state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                        }`}>
                          ${bill.total.toFixed(2)}
                        </p>
                        <button
                          onClick={() => generateBillPDF(bill)}
                          className={`p-2 rounded-lg ${
                            state.theme === 'dark'
                              ? 'text-blue-400 hover:bg-gray-700'
                              : 'text-blue-600 hover:bg-gray-100'
                          }`}
                          title="Download PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-8 ${
                state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No bills found for {selectedCompany.name}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}