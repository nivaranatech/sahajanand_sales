import React from 'react';
import { Plus, Eye, Building2, Store, Package } from 'lucide-react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, shopName: string) => void;
  onViewDetails: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const { state } = useApp();

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { text: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (quantity < 10) return { text: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const stockStatus = getStockStatus(product.quantity);

  return (
    <div className={`rounded-xl border transition-all hover:scale-105 hover:shadow-lg ${
      state.theme === 'dark'
        ? 'bg-gray-800 border-gray-700 hover:shadow-gray-900/20'
        : 'bg-white border-gray-200 hover:shadow-gray-200/50'
    }`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className={`font-semibold text-lg mb-1 ${
              state.theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {product.name}
            </h3>
            <p className={`text-sm ${
              state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              ID: {product.productId}
            </p>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
            {stockStatus.text}
          </span>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span className={`text-sm ${
              state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {product.companyName}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Store className="w-4 h-4 text-emerald-500" />
            <span className={`text-sm ${
              state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {product.shopName}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-purple-500" />
            <span className={`text-sm ${
              state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {product.quantity} units available
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={`text-2xl font-bold ${
              state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              ₹{product.price}
            </span>
            {product.gst && product.gst > 0 && (
              <span className={`text-sm ml-2 ${
                state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                +{product.gst}% GST
              </span>
            )}
          </div>
          {product.category && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              state.theme === 'dark'
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {product.category}
            </span>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onViewDetails(product)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              state.theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </button>
          <button
            onClick={() => onAddToCart(product, product.shopName)}
            disabled={product.quantity === 0}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              product.quantity === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}