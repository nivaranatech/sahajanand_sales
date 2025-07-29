import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Edit, Receipt } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CartItem, Bill } from '../types';
import { jsPDF } from 'jspdf';

export default function Cart() {
  const { state, dispatch } = useApp();
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    quantity: number;
    discount: number;
    discountType: 'percentage' | 'amount';
  }>({ quantity: 1, discount: 0, discountType: 'percentage' });
  const [customerName, setCustomerName] = useState('');
  const [showBillPreview, setShowBillPreview] = useState(false);

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const item = state.cart[index];
    const updatedItem = { ...item, quantity: newQuantity };
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { index, item: updatedItem } });
  };

  const removeItem = (index: number) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: index });
  };

  const openEditModal = (index: number) => {
    const item = state.cart[index];
    setEditingItem(index);
    setEditForm({
      quantity: item.quantity,
      discount: item.discount,
      discountType: item.discountType
    });
  };

  const saveEdit = () => {
    if (editingItem === null) return;
    
    const item = state.cart[editingItem];
    const updatedItem = {
      ...item,
      quantity: editForm.quantity,
      discount: editForm.discount,
      discountType: editForm.discountType
    };
    
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { index: editingItem, item: updatedItem } });
    setEditingItem(null);
  };

  const calculateItemTotal = (item: CartItem) => {
    const basePrice = item.product.price * item.quantity;
    let discountAmount = 0;
    
    if (item.discountType === 'percentage') {
      discountAmount = (basePrice * item.discount) / 100;
    } else {
      discountAmount = item.discount;
    }
    
    return Math.max(0, basePrice - discountAmount);
  };

  const calculateTotals = () => {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const totalDiscount = state.cart.reduce((sum, item) => {
      const basePrice = item.product.price * item.quantity;
      if (item.discountType === 'percentage') {
        return sum + (basePrice * item.discount) / 100;
      }
      return sum + item.discount;
    }, 0);
    const afterDiscount = subtotal - totalDiscount;
    const gst = state.cart.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      const itemGst = item.product.gst || 0;
      return sum + (itemTotal * itemGst) / 100;
    }, 0);
    const total = afterDiscount + gst;
    
    return { subtotal, totalDiscount, gst, total };
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const generateBillPDF = async (bill: Bill) => {
    setIsGeneratingPDF(true);
    setPdfError(null);
    
    try {
      // Check for pop-up blockers
      const testWindow = window.open('', '_blank');
      if (!testWindow) {
        setPdfError('Please allow pop-ups to download bills');
        return;
      }
      testWindow.close();

      // Create PDF
      const pdf = new jsPDF();
      
      // Add header
      pdf.setFontSize(18);
      pdf.text('ProductFlow', 105, 20, { align: 'center' });
      
      // Bill info
      pdf.setFontSize(12);
      pdf.text(`Bill Date: ${new Date(bill.date).toLocaleDateString()}`, 14, 30);
      pdf.text(`Bill ID: ${bill.id}`, 14, 40);
      if (bill.customerName) {
        pdf.text(`Customer: ${bill.customerName}`, 14, 50);
      }
      
      // Items table
      pdf.setFontSize(14);
      pdf.text('Items:', 14, 60);
      
      let y = 70;
      bill.items.forEach(item => {
        pdf.setFontSize(12);
        pdf.text(`${item.product.name} x${item.quantity}`, 14, y);
        pdf.text(`₹${calculateItemTotal(item).toFixed(2)}`, 180, y, { align: 'right' });
        y += 10;
      });
      
      // Totals
      y += 10;
      pdf.text(`Subtotal: ₹${bill.subtotal.toFixed(2)}`, 14, y);
      pdf.text(`-₹${bill.totalDiscount.toFixed(2)}`, 180, y, { align: 'right' });
      y += 10;
      pdf.text(`GST: ₹${bill.gst.toFixed(2)}`, 14, y);
      y += 10;
      pdf.setFontSize(16);
      pdf.text(`Total: ₹${bill.total.toFixed(2)}`, 14, y);
      
      // Footer
      y += 20;
      pdf.setFontSize(10);
      pdf.text('Thank you for your business!', 105, y, { align: 'center' });
      
      // Save with descriptive filename
      const filename = `ProductFlow_Bill_${bill.id}_${new Date(bill.date).toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      setPdfError('Failed to generate PDF. Please try again or check console for details.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateBill = () => {
    const totals = calculateTotals();
    const bill: Bill = {
      id: `BILL-${Date.now()}`,
      customerName: customerName.trim() || undefined,
      date: new Date(),
      items: [...state.cart],
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      gst: totals.gst,
      gstAmount: totals.gst,
      finalAmount: totals.total,
      billNumber: `BILL-${Date.now()}`,
      total: totals.total
    };
    
    dispatch({ type: 'ADD_BILL', payload: bill });
    dispatch({ type: 'CLEAR_CART' });
    setCustomerName('');
    setShowBillPreview(false);
    
    generateBillPDF(bill);
  };

  const totals = calculateTotals();

  if (state.cart.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={`text-3xl font-bold ${
            state.theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Shopping Cart
          </h1>
          <p className={`mt-2 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Your cart is empty. Add products to get started.
          </p>
        </div>

        <div className={`text-center py-12 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
          <p>Browse products and add them to your cart to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${
          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Shopping Cart
        </h1>
        <p className={`mt-2 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Review and manage your selected items.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {state.cart.map((item, index) => (
            <div key={index} className={`p-6 rounded-xl border ${
              state.theme === 'dark'
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${
                    state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.product.name}
                  </h3>
                  <p className={`text-sm ${
                    state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {item.product.companyName} • {item.selectedShop}
                  </p>
                  <p className={`text-sm ${
                    state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    ₹{item.product.price} each
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(index)}
                    className={`p-2 rounded-lg ${
                      state.theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                    className={`p-1 rounded ${
                      state.theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className={`font-medium ${
                    state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                    className={`p-1 rounded ${
                      state.theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
                  {item.discount > 0 && (
                    <p className={`text-sm line-through ${
                      state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  )}
                  <p className={`font-bold text-lg ${
                    state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  }`}>
                    ₹{calculateItemTotal(item).toFixed(2)}
                  </p>
                  {item.discount > 0 && (
                    <p className="text-sm text-red-500">
                      -{item.discountType === 'percentage' ? `${item.discount}%` : `₹${item.discount}`} discount
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`p-6 rounded-xl border h-fit ${
          state.theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            state.theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Order Summary
          </h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Subtotal:
              </span>
              <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                ₹{totals.subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Discount:
              </span>
              <span className="text-red-500">
                -₹{totals.totalDiscount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                GST:
              </span>
              <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                ₹{totals.gst.toFixed(2)}
              </span>
            </div>
            <hr className={state.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} />
            <div className="flex justify-between text-lg font-bold">
              <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                Total:
              </span>
              <span className={state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                ₹{totals.total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${
                state.theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <button
              onClick={() => setShowBillPreview(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {/* <Receipt className="w-4 h-4" /> */}
              <span>Generate Bill</span>
            </button>
          </div>
        </div>
      </div>

      {editingItem !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-md w-full rounded-xl ${
            state.theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${
                state.theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Edit Item
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      state.theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Discount Type
                  </label>
                  <select
                    value={editForm.discountType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, discountType: e.target.value as 'percentage' | 'amount' }))}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      state.theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.discount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      state.theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={saveEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    state.theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBillPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-xl ${
            state.theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-xl font-bold mb-4 ${
                state.theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Bill Preview
              </h2>

              <div className="space-y-4 mb-6">
                <div className="text-center">
                  <h3 className={`text-lg font-bold ${
                    state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    ProductFlow
                  </h3>
                  <p className={`text-sm ${
                    state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                  </p>
                  {customerName && (
                    <p className={`text-sm ${
                      state.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Customer: {customerName}
                    </p>
                  )}
                </div>

                <hr className={state.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-2">
                  {state.cart.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <p className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                          {item.product.name} x{item.quantity}
                        </p>
                        <p className={`text-xs ${
                          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          ₹{item.product.price} each
                        </p>
                      </div>
                      <p className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        ₹{calculateItemTotal(item).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <hr className={state.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>₹{totals.gst.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between font-bold text-lg ${
                    state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  }`}>
                    <span>Total:</span>
                    <span>₹{totals.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center text-sm">
                  <p className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Thank you for your business!
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={generateBill}
                  disabled={isGeneratingPDF}
                  className={`flex-1 ${
                    isGeneratingPDF
                      ? 'bg-emerald-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  } text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center`}
                >
                  {isGeneratingPDF ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    'Confirm & Download Bill'
                  )}
                </button>
                {pdfError && (
                  <p className="text-red-500 text-sm mt-2">{pdfError}</p>
                )}
                <button
                  onClick={() => setShowBillPreview(false)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    state.theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}