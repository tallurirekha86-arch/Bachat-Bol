import type { Category, PaymentMode, TransactionType } from './types';

export interface GeminiParsed {
  amount: number;
  type: TransactionType;
  mode: PaymentMode;
  category: Category;
}

const VALID_CATEGORIES: Category[] = [
  'sales', 'fuel', 'food', 'rent', 'transport', 'supplies', 'repairs', 'salary', 'other',
];

const PROMPT = `You extract structured transaction data from messy Hinglish (Hindi-English mix) or Tenglish (Telugu-English mix) sentences from Indian street vendors and gig workers.

Return ONLY a JSON object with these fields:
- "amount": number (rupees; expand words like "hazaar"=1000, " sau"=100, "bees"=20)
- "type": "income" if money received (earned, kamaya, mila, aaya, received, collected) or "expense" if money paid (kharcha, spent, diya, bought, paid)
- "mode": "cash", "upi" (also GPay, PhonePe, Paytm, online, scan), or "card"
- "category": exactly one of ${JSON.stringify(VALID_CATEGORIES)} (sales for earnings from customers/rides/deliveries, fuel for petrol/diesel, food for eating out, transport for auto/bus/cab fare, rent, supplies for stock/material, repairs, salary, other)

Examples:
"upar wale ne 200 diye" -> {"amount":200,"type":"income","mode":"cash","category":"sales"}
"gpay se 450 ka petol dalwaya" -> {"amount":450,"type":"expense","mode":"upi","category":"fuel"}
"aaj ki bikri pandrah sau cash" -> {"amount":1500,"type":"income","mode":"cash","category":"sales"}

Sentence: `;

export function isGeminiKeySaved(): boolean {
  return Boolean(localStorage.getItem('bachat-bol-gemini-key'));
}

export function getGeminiKey(): string {
  return localStorage.getItem('bachat-bol-gemini-key') ?? '';
}

export function saveGeminiKey(key: string) {
  if (key.trim()) localStorage.setItem('bachat-bol-gemini-key', key.trim());
  else localStorage.removeItem('bachat-bol-gemini-key');
}

export async function parseWithGemini(transcript: string, apiKey: string): Promise<GeminiParsed> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT + transcript }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 400 || res.status === 403) {
      throw new Error('Gemini rejected the API key. Check it in Settings.');
    }
    throw new Error('Gemini could not be reached. Using the built-in parser.');
  }

  const data: unknown = await res.json();
  const text: string | undefined = (data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  })?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned nothing useful. Using the built-in parser.');

  interface RawParsed {
    amount?: number | string;
    type?: string;
    mode?: string;
    category?: string;
  }
  let raw: RawParsed;
  try {
    raw = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini reply was unreadable. Using the built-in parser.');
    raw = JSON.parse(match[0]);
  }

  const amount = Number(raw.amount);
  if (!isFinite(amount) || amount <= 0) {
    throw new Error('No amount found in that sentence.');
  }

  const type: TransactionType = raw.type === 'income' ? 'income' : 'expense';
  const mode: PaymentMode = ['cash', 'upi', 'card'].includes(raw.mode ?? '')
    ? (raw.mode as PaymentMode)
    : 'unknown';
  const category: Category = VALID_CATEGORIES.includes(raw.category as Category)
    ? (raw.category as Category)
    : 'other';

  return { amount, type, mode, category };
}
