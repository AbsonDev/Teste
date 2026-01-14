
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
  action: 'add_item' | 'complete_item' | 'delete_item' | 'finish_list' | 'create_list' | 'update_pantry';
  details: string; // "Maçã (x2)" or "Compras da Semana"
  metadata?: {
    value?: number; // For prices
    count?: number; // For item counts
  };
  createdAt: number;
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
  { id: 'green', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  { id: 'red', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  { id: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  { id: 'gray', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  { id: 'orange', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
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