
import { Timestamp } from 'firebase/firestore';

// --- SaaS Types ---

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  createdAt: any; // Timestamp
  subscriptionStatus: 'active' | 'trial' | 'suspended' | 'cancelled';
  paidUntil: any; // Timestamp
  plan: 'basic' | 'pro';
  
  // Configs that were previously in config/main
  appName?: string;
  appLogoUrl?: string;
  bannerUrl?: string;
  theme?: string;
  phone?: string; // WhatsApp
  address?: string;
  storePhone?: string;
}

export interface SaaSUser {
  uid: string;
  email: string;
  role: 'owner' | 'staff';
  tenantId: string;
}

// --- Existing Types (Preserved) ---

export interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  children?: FileNode[];
  content?: string; // Only for files
  language?: string;
  extension?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export enum AnalysisType {
  EXPLAIN = 'EXPLAIN',
  REFACTOR = 'REFACTOR',
  SECURITY = 'SECURITY',
  DOCS = 'DOCS',
  CHAT = 'CHAT'
}

export interface ProcessingState {
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
    available?: boolean;
    costPrice?: number;
    operationalCost?: number;
    ingredients?: string[]; // IDs de InventoryItem
}

export interface Order {
    id: string;
    customer: string;
    phone: string;
    address: string;
    items: string; // Texto formatado ou JSON string
    value: number;
    status: 'pending' | 'preparing' | 'ready' | 'assigned' | 'delivering' | 'completed' | 'cancelled';
    createdAt: any;
    paymentMethod: string;
    driverId?: string;
    deliveryFee?: number;
    origin?: 'manual' | 'menu' | 'ifood';
    mapsLink?: string;
    completedAt?: any;
    assignedAt?: any;
    neighborhood?: string;
    obs?: string;
}

export interface Client {
    id: string;
    name: string;
    phone: string;
    address: string;
    ordersCount?: number;
    totalSpent?: number;
    lastOrder?: any;
    obs?: string;
    mapsLink?: string;
}

export interface Driver {
    id: string;
    name: string;
    phone: string;
    plate?: string;
    vehicle?: string;
    status: 'available' | 'delivering' | 'offline';
    avatar?: string;
    lat?: number;
    lng?: number;
    heading?: number;
    speed?: number;
    lastUpdate?: any;
    battery?: number;
    paymentModel?: 'fixed_per_delivery' | 'percentage' | 'salary';
    paymentRate?: number;
    lastSettlementAt?: any;
    password?: string; // Senha simples para login do motorista
}

// --- Dispatch / Ofertas de Entrega (estilo iFood) ---
export interface DriverOffer {
    id: string;
    tenantId: string;
    orderId: string;
    driverId: string;
    status: 'pending' | 'accepted' | 'expired' | 'declined';
    createdAt: any;
    expiresAt: any;

    // Snapshot mínimo do pedido (para o motoboy visualizar sem precisar buscar o order)
    customer: string;
    phone: string;
    address: string;
    mapsLink?: string;
    value: number;
    paymentMethod?: string;

    // Opcional: usado para ordenar por proximidade
    targetLat?: number;
    targetLng?: number;
    distanceMeters?: number;
}

export interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: any;
    paid: boolean;
}

export interface InventoryItem {
    id: string;
    name: string;
    unit: 'kg' | 'g' | 'l' | 'ml' | 'un' | 'fatia';
    quantity: number;
    minQuantity: number;
    cost: number; // Custo unitário
    supplierId?: string;
    updatedAt: any;
}

export interface ShoppingItem {
    id: string;
    name: string;
    isChecked: boolean;
    createdAt: any;
}

export interface Supplier {
    id: string;
    name: string;
    contact: string;
    category: string;
    obs?: string;
}

export interface DailyStats {
    id: string;
    date: string; // YYYY-MM-DD
    visits: number;
    orders: number;
    revenue: number;
}

export interface GiveawayEntry {
    id: string;
    name: string;
    phone: string;
    createdAt: any;
    confirmed: boolean;
    dynamicData?: any; // Respostas dos campos personalizados
}

export interface GiveawayWinner {
    id: string;
    entryId: string;
    name: string;
    phone: string;
    prize: string;
    wonAt: any;
}

export interface Settlement {
    id: string;
    driverId: string;
    driverName: string;
    startAt: any;
    endAt: any;
    deliveriesCount: number;
    deliveriesTotal: number;
    valesTotal: number;
    finalAmount: number;
    createdAt: any;
}

export interface Vale {
    id: string;
    driverId: string;
    amount: number;
    description: string;
    createdAt: any;
    settled: boolean; // Se já foi descontado
}

export interface DeliveryZone {
    name: string;
    fee: number;
}

export interface GiveawayFieldConfig {
    id: string;
    label: string;
    type: 'text' | 'phone' | 'email' | 'date';
    required: boolean;
    enabled: boolean;
    placeholder?: string;
}

export interface AppConfig {
    appName: string;
    appLogoUrl: string;
    bannerUrl?: string; // Banner do cardápio
    
    // Configurações do Sorteio
    giveawaySettings?: {
        active: boolean;
        title: string;
        rules: string;
        fields: GiveawayFieldConfig[];
    };

    // Configurações de Destaques
    featuredSettings?: {
        active: boolean;
        title: string;
        productIds: string[];
    };

    // Configurações de Loja
    schedule?: { [key: number]: { enabled: boolean, open: string, close: string } }; // 0=Dom, 6=Sab
    deliveryZones?: DeliveryZone[];
    enableDeliveryFees?: boolean;
    minOrderValue?: number;
    estimatedTime?: string;
    
    // Contato
    storePhone?: string;
    storeCountryCode?: string;
    
    // Pagamento
    pixKey?: string;
    pixName?: string;
    pixCity?: string;
    
    // Promoção Banner
    promoTitle?: string;
    promoSubtitle?: string;
    promoMode?: 'card' | 'banner'; // Card = Clássico, Banner = Imagem Full
    promoDate?: string;
    promoTime?: string;
    promoLocation?: string;

    // Welcome Popup
    welcomeMode?: 'image' | 'text';
    welcomeBannerUrl?: string;
    welcomeTitle?: string;
    welcomeMessage?: string;
    welcomeButtonText?: string;

    // Integrations
    facebookPixelId?: string;

    // Sistema
    /** Raio de busca de motoboys (em km). Usado no dispatch automático. */
    dispatchRadiusKm?: number;
    printerWidth?: '58mm' | '80mm';
    location?: { lat: number, lng: number };
}

export type UserType = 'client' | 'admin' | 'driver' | 'kitchen';
