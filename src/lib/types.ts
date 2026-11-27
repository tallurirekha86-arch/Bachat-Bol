export type TransactionType = 'income' | 'expense';

export type PaymentMode = 'cash' | 'upi' | 'card' | 'unknown';

export type Category =
  | 'sales'
  | 'fuel'
  | 'food'
  | 'rent'
  | 'transport'
  | 'supplies'
  | 'repairs'
  | 'salary'
  | 'other';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  mode: PaymentMode;
  category: Category;
  note: string;
  createdAt: number; // epoch ms
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  sales: { label: 'Sales', emoji: '🛵' },
  fuel: { label: 'Fuel', emoji: '⛽' },
  food: { label: 'Food', emoji: '🍲' },
  rent: { label: 'Rent', emoji: '🏠' },
  transport: { label: 'Transport', emoji: '🚗' },
  supplies: { label: 'Supplies', emoji: '📦' },
  repairs: { label: 'Repairs', emoji: '🔧' },
  salary: { label: 'Salary', emoji: '💼' },
  other: { label: 'Other', emoji: '🧾' },
};
