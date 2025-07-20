import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product, CartItem, Bill, Theme, ViewMode } from '../types';

interface AppState {
  products: Product[];
  cart: CartItem[];
  bills: Bill[];
  theme: Theme;
  currentView: ViewMode;
  searchTerm: string;
  selectedCompany: string | null;
  selectedShop: string | null;
}

type AppAction =
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCTS'; payload: Product[] }
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
  | { type: 'DELETE_PRODUCT'; payload: string };

const initialState: AppState = {
  products: [],
  cart: [],
  bills: [],
  theme: 'light',
  currentView: 'dashboard',
  searchTerm: '',
  selectedCompany: null,
  selectedShop: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCTS':
      const existingIds = new Set(state.products.map(p => p.productId));
      const newProducts = action.payload.filter(p => !existingIds.has(p.productId));
      return { ...state, products: [...state.products, ...newProducts] };
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
        products: state.products.map(p => p.id === action.payload.id ? action.payload : p)
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p.id !== action.payload)
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