import React from 'react';
import { FileText, Download, Search, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Bill } from '../types';
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
  try {
    // Create a new PDF instance
    const pdf = new jsPDF();
    
    // Set initial position
    let yPos = 20;
    
    // Add header
    pdf.setFontSize(18);
    pdf.setTextColor(40, 40, 40);
    pdf.text('ProductFlow', 105, yPos, { align: 'center' });
    yPos += 10;
    
    pdf.setFontSize(12);
    pdf.text('Bill Receipt', 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Bill info - ensure single line for ID and Date
    pdf.setFontSize(10);
    pdf.text(`Bill ID: ${bill.id}`, 14, yPos);
    pdf.text(`Date: ${new Date(bill.date).toLocaleDateString()}`, 160, yPos, { align: 'right' });
    yPos += 8;
    
    if (bill.customerName) {
      pdf.text(`Customer: ${bill.customerName}`, 14, yPos);
      yPos += 8;
    }
    
    // Add line separator
    pdf.setDrawColor(200, 200, 200);
    pdf.line(14, yPos, 196, yPos);
    yPos += 15;
    
    // Add items header
    pdf.setFontSize(12);
    pdf.setTextColor(40, 40, 40);
    pdf.text('Items', 14, yPos);
    yPos += 10;
    
    // Format number function
    const formatNumber = (num: number) => {
      return '₹' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
    
    // Add items
    pdf.setFontSize(10);
    bill.items.forEach(item => {
      const itemTotal = item.product.price * item.quantity;
      pdf.text(`${item.product.name} x${item.quantity}`, 14, yPos);
      pdf.text(formatNumber(itemTotal), 180, yPos, { align: 'right' });
      yPos += 8;
    });
    
    // Add totals separator
    yPos += 5;
    pdf.line(14, yPos, 196, yPos);
    yPos += 10;
    
    // Add totals
    pdf.setFontSize(12);
    
    // Subtotal
    pdf.text(`Subtotal: ${formatNumber(bill.subtotal)}`, 14, yPos);
    pdf.text(formatNumber(bill.subtotal), 180, yPos, { align: 'right' });
    yPos += 10;
    
    // Discount
    if (bill.totalDiscount > 0) {
      pdf.setTextColor(200, 0, 0);
      pdf.text(`Discount: -${formatNumber(bill.totalDiscount)}`, 14, yPos);
      pdf.text(`-${formatNumber(bill.totalDiscount)}`, 180, yPos, { align: 'right' });
      yPos += 10;
      pdf.setTextColor(40, 40, 40);
    }
    
    // GST
    pdf.text(`GST: ${formatNumber(bill.gst)}`, 14, yPos);
    pdf.text(formatNumber(bill.gst), 180, yPos, { align: 'right' });
    yPos += 15;
    
    // Total
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total: ${formatNumber(bill.total)}`, 14, yPos);
    pdf.text(formatNumber(bill.total), 180, yPos, { align: 'right' });
    yPos += 20;
    
    // Footer
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Thank you for your business!', 105, yPos, { align: 'center' });
    yPos += 5;
    pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' });
    
    // Save the PDF
    pdf.save(`bill_${bill.id}.pdf`);
    
    // Provide user feedback
    alert('Bill downloaded successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
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