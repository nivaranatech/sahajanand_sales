import React from 'react';
import { Package, Building2, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Dashboard() {
  const { state } = useApp();

  const totalProducts = state.products.length;
  const totalCompanies = new Set(state.products.map(p => p.companyName)).size;
  const totalShops = new Set(state.products.map(p => p.shopName)).size;
  const lowStockProducts = state.products.filter(p => p.quantity < 10);
  const recentBills = state.bills.slice(-5).reverse();

  const topSearchedProducts = state.products
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, color, bgColor }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
  }) => (
    <div className={`p-6 rounded-xl border transition-all hover:scale-105 hover:shadow-lg ${
      state.theme === 'dark'
        ? 'bg-gray-800 border-gray-700 hover:shadow-gray-900/20'
        : 'bg-white border-gray-200 hover:shadow-gray-200/50'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${
            state.theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${
          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Dashboard Overview
        </h1>
        <p className={`mt-2 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Welcome back! Here's what's happening with your inventory.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Companies"
          value={totalCompanies}
          icon={Building2}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
        <StatCard
          title="Cart Items"
          value={state.cart.length}
          icon={ShoppingCart}
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warnings */}
        <div className={`p-6 rounded-xl border ${
          state.theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className={`text-xl font-semibold ${
              state.theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Low Stock Alerts
            </h2>
          </div>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div>
                    <p className={`font-medium ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {product.name}
                    </p>
                    <p className={`text-sm ${
                      state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {product.companyName} • {product.shopName}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                    {product.quantity} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${
              state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No low stock items
            </p>
          )}
        </div>

        {/* Top Products */}
        <div className={`p-6 rounded-xl border ${
          state.theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h2 className={`text-xl font-semibold ${
              state.theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Top Stocked Products
            </h2>
          </div>
          {topSearchedProducts.length > 0 ? (
            <div className="space-y-3">
              {topSearchedProducts.map((product, index) => (
                <div key={product.id} className={`flex items-center justify-between p-3 rounded-lg ${
                  state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white text-xs font-bold flex items-center justify-center`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className={`font-medium ${
                        state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {product.name}
                      </p>
                      <p className={`text-sm ${
                        state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        ${product.price}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    {product.quantity} in stock
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-center py-8 ${
              state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No products available
            </p>
          )}
        </div>
      </div>

      {/* Recent Bills */}
      <div className={`p-6 rounded-xl border ${
        state.theme === 'dark'
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Recent Bills
        </h2>
        {recentBills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${
                  state.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <th className={`text-left py-2 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Bill ID
                  </th>
                  <th className={`text-left py-2 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Customer
                  </th>
                  <th className={`text-left py-2 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Date
                  </th>
                  <th className={`text-left py-2 px-4 font-medium ${
                    state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentBills.map((bill) => (
                  <tr key={bill.id} className={`border-b ${
                    state.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <td className={`py-2 px-4 ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      #{bill.id.slice(-6)}
                    </td>
                    <td className={`py-2 px-4 ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {bill.customerName || 'Walk-in Customer'}
                    </td>
                    <td className={`py-2 px-4 ${
                      state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {new Date(bill.date).toLocaleDateString()}
                    </td>
                    <td className={`py-2 px-4 font-semibold ${
                      state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    }`}>
                      ${bill.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={`text-center py-8 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            No bills generated yet
          </p>
        )}
      </div>
    </div>
  );
}