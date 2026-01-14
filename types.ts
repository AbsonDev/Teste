
export type Role = 'owner' | 'editor' | 'viewer';

export interface ShoppingItem {
  id: string;
  name: string;
  category?: string; // Stores the category name
  completed: boolean;
  createdAt: number;
  price?: number;
  quantity?: number; // Used for shopping list (amount to buy)
  
  // Pantry specific fields
  currentQuantity?: number;
  idealQuantity?: number;
}

export interface ShoppingListGroup {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: number;
  budget?: number;
  archived?: boolean;
  type?: 'list' | 'pantry';
  userId?: string; // Original creator
  members?: string[]; // Array of UIDs who have access
  memberEmails?: string[]; // Array of Emails who have access (for validation)
  roles?: { [userId: string]: Role }; // Map of userID to Role
  ownerEmail?: string; // To help identify who shared it
}

export interface Invite {
  id: string;
  listId: string;
  listName: string;
  invitedBy: string; // Name or Email of inviter
  toEmail: string;
  createdAt: number;
}

export interface HistoryLog {
  id: string;
  userId: string;
  userName?: string;
  action: 'add_item' | 'complete_item' | 'delete_item' | 'finish_list' | 'create_list' | 'update_pantry' | 'chef_cook' | 'scan_receipt';
  details: string; // "Maçã (x2)" or "Compras da Semana"
  metadata?: {
    value?: number; // For prices
    count?: number; // For item counts
  };
  createdAt: number;
}

export interface Recipe {
  title: string;
  time: string; // e.g. "30 min"
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  usedIngredients: string[]; // Items found in pantry
  missingIngredients: string[]; // Items needed to buy
  instructionsShort: string; // Brief description
}

export interface ScannedItem {
  originalName: string; // The name found in the user's list (if matched) or the raw name
  receiptName: string; // The text found on the receipt
  price: number;
  quantity: number; // The quantity found on the receipt
  confidence: 'high' | 'low';
}

export interface CategoryColor {
  id: string;
  bg: string;
  text: string;
  border: string;
}

export interface Category {
  id: string;
  name: string;
  colorId: string;
}

export const COLOR_PALETTES: CategoryColor[] = [
  { id: 'green', bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'red', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  { id: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-800 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'gray', bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  { id: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-800 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  { id: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-800 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Frutas e Verduras', colorId: 'green' },
  { id: '2', name: 'Laticínios', colorId: 'blue' },
  { id: '3', name: 'Carnes', colorId: 'red' },
  { id: '4', name: 'Padaria', colorId: 'yellow' },
  { id: '5', name: 'Limpeza', colorId: 'purple' },
  { id: '6', name: 'Outros', colorId: 'gray' },
];

export const DEFAULT_COLOR = COLOR_PALETTES.find(c => c.id === 'gray')!;
