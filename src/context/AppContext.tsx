import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product, CartItem, Bill, Theme, ViewMode } from '../types';

interface User {
  id: string;
  name: string;
  shopName: string;
  email?: string;
}

interface AppState {
  products: Product[];
  cart: CartItem[];
  bills: Bill[];
  theme: Theme;
  currentView: ViewMode;
  searchTerm: string;
  selectedCompany: string | null;
  selectedShop: string | null;
  user: User | null;
  // File management state
  uploadedFiles: string[]; // Track all uploaded files
  fileTypeFilter: 'all' | 'excel' | 'pdf'; // Current filter
}

type AppAction =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCTS'; payload: { products: Product[]; fileName?: string } }
  | { type: 'ADD_TO_CART'; payload: CartItem }
  | { type: 'UPDATE_CART_ITEM'; payload: { index: number; item: CartItem } }
  | { type: 'REMOVE_FROM_CART'; payload: number }
  | { type: 'CLEAR_CART' }
  | { type: 'ADD_BILL'; payload: Bill }
  | { type: 'SET_THEME'; payload: Theme }
  | { type: 'SET_VIEW'; payload: ViewMode } 
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_SELECTED_COMPANY'; payload: string | null }
  | { type: 'SET_SELECTED_SHOP'; payload: string | null }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_FILE_TYPE_FILTER'; payload: 'all' | 'excel' | 'pdf' }
  | { type: 'ADD_UPLOADED_FILE'; payload: string }
  | { type: 'REMOVE_PRODUCTS_BY_FILE'; payload: string }; // For removing products from specific file

const initialState: AppState = {
  products: [],
  cart: [],
  bills: [],
  theme: 'light',
  currentView: 'dashboard',
  searchTerm: '',
  selectedCompany: null,
  selectedShop: null,
  user: null,
  uploadedFiles: [],
  fileTypeFilter: 'all',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
      
    case 'ADD_PRODUCTS':
      const existingIds = new Set(state.products.map(p => p.productId));
      let newProducts = action.payload.products.filter(p => !existingIds.has(p.productId));
      
      // Add file source to products if fileName is provided
      if (action.payload.fileName) {
        newProducts = newProducts.map(product => ({
          ...product,
          fileSource: action.payload.fileName,
          sourceFile: action.payload.fileName
        }));
      }
      
      return { 
        ...state, 
        products: [...state.products, ...newProducts],
        uploadedFiles: action.payload.fileName && !state.uploadedFiles.includes(action.payload.fileName)
          ? [...state.uploadedFiles, action.payload.fileName]
          : state.uploadedFiles
      };
      
    case 'ADD_TO_CART':
      return { ...state, cart: [...state.cart, action.payload] };
      
    case 'UPDATE_CART_ITEM':
      const updatedCart = [...state.cart];
      updatedCart[action.payload.index] = action.payload.item;
      return { ...state, cart: updatedCart };
      
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((_, index) => index !== action.payload) };
      
    case 'CLEAR_CART':
      return { ...state, cart: [] };
      
    case 'ADD_BILL':
      return { ...state, bills: [...state.bills, action.payload] };
      
    case 'SET_THEME':
      return { ...state, theme: action.payload };
      
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
      
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
      
    case 'SET_SELECTED_COMPANY':
      return { ...state, selectedCompany: action.payload };
      
    case 'SET_SELECTED_SHOP':
      return { ...state, selectedShop: action.payload };
      
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p => 
          (p.id === action.payload.id || p.productId === action.payload.productId) 
            ? action.payload 
            : p
        )
      };
      
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => 
          p.id !== action.payload && p.productId !== action.payload
        )
      };
      
    case 'SET_USER':
      return { ...state, user: action.payload };
      
    case 'SET_FILE_TYPE_FILTER':
      return { ...state, fileTypeFilter: action.payload };
      
    case 'ADD_UPLOADED_FILE':
      return {
        ...state,
        uploadedFiles: state.uploadedFiles.includes(action.payload)
          ? state.uploadedFiles
          : [...state.uploadedFiles, action.payload]
      };
      
    case 'REMOVE_PRODUCTS_BY_FILE':
      const remainingProducts = state.products.filter(p => 
        p.fileSource !== action.payload && p.sourceFile !== action.payload
      );
      const remainingFiles = state.uploadedFiles.filter(file => file !== action.payload);
      
      return {
        ...state,
        products: remainingProducts,
        uploadedFiles: remainingFiles,
        // Also clean up cart items from the removed file
        cart: state.cart.filter(item => 
          item.product.fileSource !== action.payload && 
          item.product.sourceFile !== action.payload
        )
      };
      
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Helper functions for file management
export const useFileManagement = () => {
  const { state, dispatch } = useApp();

  const getFileStats = () => {
    const stats = {
      total: state.products.length,
      excel: 0,
      pdf: 0,
      files: new Set<string>()
    };
    
    state.products.forEach(product => {
      const fileSource = product.fileSource || product.sourceFile;
      if (fileSource) {
        stats.files.add(fileSource);
        if (fileSource.match(/\.(xlsx|xls|csv)$/i)) {
          stats.excel++;
        } else if (fileSource.match(/\.pdf$/i)) {
          stats.pdf++;
        }
      }
    });
    
    return { ...stats, fileCount: stats.files.size };
  };

  const getProductsByFile = (fileName: string) => {
    return state.products.filter(product => 
      product.fileSource === fileName || product.sourceFile === fileName
    );
  };

  const removeProductsByFile = (fileName: string) => {
    dispatch({ type: 'REMOVE_PRODUCTS_BY_FILE', payload: fileName });
  };

  const getUniqueFiles = () => {
    return Array.from(new Set([
      ...state.uploadedFiles,
      ...state.products.map(p => p.fileSource || p.sourceFile).filter(Boolean)
    ]));
  };

  return {
    fileStats: getFileStats(),
    getProductsByFile,
    removeProductsByFile,
    uniqueFiles: getUniqueFiles(),
    uploadedFiles: state.uploadedFiles
  };
};

export default AppContext;
