import React from 'react';
import { FileText, Download, Search, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Bill } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function Bills() {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState('');

  const filteredBills = React.useMemo(() => {
    return state.bills.filter(bill => {
      const matchesSearch = 
        bill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.customerName && bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDate = dateFilter 
        ? new Date(bill.date).toLocaleDateString('en-CA') === new Date(dateFilter).toLocaleDateString('en-CA')
        : true;
      
      return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.bills, searchTerm, dateFilter]);

  const generatePDF = async (bill: Bill) => {
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
          ${bill.items.map((item, index) => `
            <div key=${index} style="display: flex; justify-content: space-between; padding: 8px 0;">
              <div>
                <p style="font-weight: 500;">${item.product.name}</p>
                <p style="font-size: 12px; color: #666;">
                  ${item.quantity} × ₹${item.product.price.toFixed(2)}
                </p>
              </div>
              <p>₹${(item.product.price * item.quantity).toFixed(2)}</p>
            </div>
          `).join('')}
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${
          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Bill History
        </h1>
        <p className={`mt-2 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          View and manage all generated bills
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`relative rounded-xl border ${
          state.theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search by bill ID or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border-0 ${
              state.theme === 'dark'
                ? 'bg-gray-800 text-white placeholder-gray-400'
                : 'bg-white text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        <div className={`relative rounded-xl border ${
          state.theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <Calendar className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-xl border-0 ${
              state.theme === 'dark'
                ? 'bg-gray-800 text-white placeholder-gray-400'
                : 'bg-white text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        <div className={`flex items-center justify-end ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Showing {filteredBills.length} of {state.bills.length} bills
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${
        state.theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        {filteredBills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${
                  state.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <th className={`text-left py-3 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Bill ID
                  </th>
                  <th className={`text-left py-3 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Customer
                  </th>
                  <th className={`text-left py-3 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Date
                  </th>
                  <th className={`text-left py-3 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Items
                  </th>
                  <th className={`text-right py-3 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Total
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill) => (
                  <tr 
                    key={bill.id} 
                    className={`border-b ${
                      state.theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <td className={`py-3 px-4 ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      #{bill.id.slice(-6)}
                    </td>
                    <td className={`py-3 px-4 ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {bill.customerName || 'Walk-in Customer'}
                    </td>
                    <td className={`py-3 px-4 ${
                      state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {new Date(bill.date).toLocaleDateString()}
                    </td>
                    <td className={`py-3 px-4 ${
                      state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {bill.items.length} items
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      ₹{bill.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => generatePDF(bill)}
                        className={`p-2 rounded-lg ${
                          state.theme === 'dark'
                            ? 'text-blue-400 hover:bg-gray-700'
                            : 'text-blue-600 hover:bg-gray-100'
                        }`}
                        title="Download PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-center py-12 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No bills found</h3>
            <p>Try adjusting your search filters or generate new bills.</p>
          </div>
        )}
      </div>
    </div>
  );
}