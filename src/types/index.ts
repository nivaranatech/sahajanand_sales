export interface Product {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  description?: string;
  companyName: string;
  shopName: string;
  gst?: number;
  fileSource?: string; // Source file name
  sourceFile?: string; // Alternative field name
  priceTiers?: { [key: string]: number }; // For bulk pricing
  catalogueNo?: string;
  obiArticleNo?: string;
  stock?: string | number;
  eCode?: string;
  dcat?: string;
  sap?: string;
  minOrderQty?: number;
  // Add any other fields from your Excel/PDF files
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedShop: string;
  discount: number;
  discountType: 'percentage' | 'amount';
}

export interface Bill {
id: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  totalDiscount: number;
  gst: number;
  gstAmount: number;
  finalAmount: number;
  customerName?: string;
  customerPhone?: string;
  date: Date;
  billNumber: string;
}
export interface Company {
  name: string;
  productCount: number;
  totalSales: number;
}

export type Theme = 'light' | 'dark';
export type ViewMode = 'dashboard' | 'search' | 'upload' | 'cart' | 'bills' | 'products'| 'companies'; 
