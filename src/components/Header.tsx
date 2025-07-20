import React from 'react';
import { Moon, Sun, Upload, Search, Building2, Store, ShoppingCart, FileText, Settings, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ViewMode } from '../types';

export default function Header() {
  const { state, dispatch } = useApp();

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'light' ? 'dark' : 'light' });
  };

  const setView = (view: ViewMode) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'cart', label: 'Cart', icon: ShoppingCart },
    { id: 'bills', label: 'Bills', icon: FileText },
  ];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
      state.theme === 'dark' 
        ? 'bg-gray-900/90 border-gray-700' 
        : 'bg-white/90 border-gray-200'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className={`text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent`}>
              Sahajanand Sales
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = state.currentView === item.id;
              const cartCount = item.id === 'cart' ? state.cart.length : 0;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as ViewMode)}
                  className={`relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 ${
                    isActive
                      ? state.theme === 'dark'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                        : 'bg-blue-100 text-blue-700 shadow-lg shadow-blue-200/50'
                      : state.theme === 'dark'
                        ? 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden lg:inline">{item.label}</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              state.theme === 'dark'
                ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {state.theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto py-2 space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = state.currentView === item.id;
              const cartCount = item.id === 'cart' ? state.cart.length : 0;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as ViewMode)}
                  className={`relative flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs font-medium transition-all min-w-0 ${
                    isActive
                      ? state.theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-700'
                      : state.theme === 'dark'
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  <span className="truncate">{item.label}</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}