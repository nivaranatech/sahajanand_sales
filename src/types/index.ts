export interface Product {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  companyName: string;
  shopName: string;
  price: number;
  category?: string;
  gst?: number;
  description?: string;
}

export interface CartItem {
  product: Product;
  selectedShop: string;
  quantity: number;
  discount: number;
  discountType: 'percentage' | 'amount';
}

export interface Bill {
  id: string;
  customerName?: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  gst: number;
  total: number;
}

export interface Shop {
  name: string;
  products: Product[];
}

export interface Company {
  name: string;
  products: Product[];
}

export type Theme = 'light' | 'dark';

export type ViewMode = 'dashboard' | 'search' | 'upload' | 'companies' | 'shops' | 'cart' | 'bills' | 'admin';