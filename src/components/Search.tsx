import React, { useState, useMemo } from 'react';
import { Search as SearchIcon, Plus, Building2, Store } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import ProductCard from './ProductCard';

export default function Search() {
  const { state, dispatch } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return state.products;
    
    const term = searchTerm.toLowerCase();
    return state.products.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.productId.toLowerCase().includes(term) ||
      product.companyName.toLowerCase().includes(term) ||
      product.shopName.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  }, [state.products, searchTerm]);

  const suggestions = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    const productNames = new Set<string>();
    const companyNames = new Set<string>();
    
    state.products.forEach(product => {
      if (product.name.toLowerCase().includes(term)) {
        productNames.add(product.name);
      }
      if (product.companyName.toLowerCase().includes(term)) {
        companyNames.add(product.companyName);
      }
    });
    
    return [
      ...Array.from(productNames).slice(0, 3),
      ...Array.from(companyNames).slice(0, 2)
    ].slice(0, 5);
  }, [state.products, searchTerm]);

  const addToCart = (product: Product, shopName: string) => {
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        product,
        selectedShop: shopName,
        quantity: 1,
        discount: 0,
        discountType: 'percentage'
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${
          state.theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Product Search
        </h1>
        <p className={`mt-2 ${
          state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          Search for products by name, ID, company, or shop.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className={`relative rounded-xl border ${
          state.theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <SearchIcon className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search products, companies, or shops..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-12 pr-4 py-4 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 ${
              state.theme === 'dark'
                ? 'bg-gray-800 text-white placeholder-gray-400'
                : 'bg-white text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className={`absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-lg z-10 ${
            state.theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setSearchTerm(suggestion)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl ${
                  state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-semibold ${
            state.theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Search Results
          </h2>
          <span className={`text-sm ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {filteredProducts.length} products found
          </span>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
                onViewDetails={setSelectedProduct}
              />
            ))}
          </div>
        ) : (
          <div className={`text-center py-12 ${
            state.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <SearchIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p>Try adjusting your search terms or upload new product data.</p>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl ${
            state.theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${
                  state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Product Details
                </h2>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-4 rounded-lg ${
                    state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Basic Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Product ID:</span>
                        <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedProduct.productId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Name:</span>
                        <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Category:</span>
                        <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedProduct.category || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Pricing & Stock
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Price:</span>
                        <span className={`font-bold ${state.theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          ₹{selectedProduct.price}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Quantity:</span>
                        <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedProduct.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={state.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>GST:</span>
                        <span className={state.theme === 'dark' ? 'text-white' : 'text-gray-900'}>{selectedProduct.gst || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-lg ${
                  state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h3 className={`font-semibold mb-2 ${
                    state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Vendor Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      <span className={`text-sm ${state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Company: {selectedProduct.companyName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Store className="w-4 h-4 text-emerald-500" />
                      <span className={`text-sm ${state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Shop: {selectedProduct.shopName}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className={`p-4 rounded-lg ${
                    state.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      state.theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Description
                    </h3>
                    <p className={`text-sm ${
                      state.theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      addToCart(selectedProduct, selectedProduct.shopName);
                      setSelectedProduct(null);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      state.theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}