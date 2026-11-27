import type { Category, PaymentMode, TransactionType } from './types';

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, ek: 1, one: 1, do: 2, two: 2, teen: 3, three: 3, char: 4, four: 4,
  paanch: 5, panch: 5, five: 5, chhe: 6, six: 6, saat: 7, seven: 7, aath: 8,
  eight: 8, nau: 9, nine: 9, das: 10, ten: 10, bees: 20, twenty: 20, tees: 30,
  thirty: 30, chalis: 40, forty: 40, pachas: 50, fifty: 50, saath60: 60,
  sixty: 60, hazaar: 1000, thousand: 1000, sau: 100, hundred: 100,
};

const EXPENSE_WORDS = [
  'spent', 'spend', 'paid', 'pay', 'bought', 'purchase', 'purchased', 'expense',
  'expenses', 'kharch', 'kharcha', 'kharchu', 'diya', 'gaya', 'loss', 'kharcha kiya',
];

const INCOME_WORDS = [
  'earned', 'earn', 'received', 'got', 'income', 'kamaya', 'kamai', 'aaya',
  'mile', 'mila', 'profit', 'credit', 'paid me', 'paid to me', 'collected',
];

const UPI_WORDS = ['upi', 'gpay', 'google pay', 'phone pe', 'phonepe', 'paytm',
  'bhim', 'online', 'digital', 'scan', 'qr'];

const CASH_WORDS = ['cash', 'naagad', 'nagad', 'note', 'notes', 'rupees cash', 'paisa cash'];

const CARD_WORDS = ['card', 'debit card', 'credit card', 'swipe'];

const CATEGORY_RULES: Array<{ category: Category; words: string[] }> = [
  { category: 'fuel', words: ['petrol', 'diesel', 'fuel', 'gas', 'cng', 'pump', 'petrol pump'] },
  { category: 'food', words: ['food', 'khana', 'lunch', 'dinner', 'breakfast', 'snack', 'tea', 'chai', 'coffee', 'meal', 'tiffin'] },
  { category: 'transport', words: ['ride', 'auto', 'bus', 'train', 'metro', 'cab', 'taxi', 'rickshaw', 'toll', 'fare'] },
  { category: 'rent', words: ['rent', 'kiraya', 'shop rent', 'room rent'] },
  { category: 'supplies', words: ['supply', 'supplies', 'stock', 'saman', 'material', 'grocery', 'sabzi', 'vegetables', 'raw'] },
  { category: 'repairs', words: ['repair', 'servicing', 'service', 'puncture', 'mechanic', 'tyre', 'spare'] },
  { category: 'salary', words: ['salary', 'wage', 'wages', 'helper', 'staff'] },
  { category: 'sales', words: ['sales', 'sale', 'sold', 'bikri', 'order', 'delivery', 'customer'] },
];

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

function extractAmount(text: string): number | null {
  // "₹350", "rs.350", "rupees 350", "350 rupaye"
  const symbol = text.match(/(?:₹|rs\.?|rupees?|rupaye)\s*(\d+(?:\.\d+)?)/);
  if (symbol) return parseFloat(symbol[1]);

  const after = text.match(/(\d+(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?|rupaye)/);
  if (after) return parseFloat(after[1]);

  const word = text.match(/(\d+)\s*(hazaar|hundred|thousand|sau)/);
  if (word) {
    const n = parseInt(word[1], 10);
    const mult = /hazaar|thousand/.test(word[2]) ? 1000 : 100;
    return n * mult;
  }

  const numberWord = text.match(/\b(ek|do|teen|char|paanch|panch|chhe|saat|aath|nau|das|bees|tees|chalis|pachas|hazaar)\b/);
  if (numberWord) return NUMBER_WORDS[numberWord[1]];

  const bare = text.match(/\b(\d{1,7}(?:\.\d+)?)\b/);
  if (bare) return parseFloat(bare[1]);

  return null;
}

function extractType(text: string): TransactionType {
  if (includesAny(text, EXPENSE_WORDS)) return 'expense';
  if (includesAny(text, INCOME_WORDS)) return 'income';
  return 'expense'; // safe default: money out unless clearly earned
}

function extractMode(text: string): PaymentMode {
  if (includesAny(text, UPI_WORDS)) return 'upi';
  if (includesAny(text, CARD_WORDS)) return 'card';
  if (includesAny(text, CASH_WORDS)) return 'cash';
  return 'unknown';
}

function extractCategory(text: string): Category {
  for (const rule of CATEGORY_RULES) {
    if (includesAny(text, rule.words)) return rule.category;
  }
  return 'other';
}

export interface ParsedEntry {
  amount: number;
  type: TransactionType;
  mode: PaymentMode;
  category: Category;
}

export function parseEntry(raw: string): ParsedEntry | null {
  const text = ' ' + raw.toLowerCase().replace(/[₹]/g, ' rs ').replace(/\s+/g, ' ').trim() + ' ';
  const amount = extractAmount(text);
  if (amount === null || amount <= 0 || !isFinite(amount)) return null;
  return {
    amount,
    type: extractType(text),
    mode: extractMode(text),
    category: extractCategory(text),
  };
}
