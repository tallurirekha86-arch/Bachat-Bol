import type { Transaction } from './types';
import { CATEGORY_META } from './types';
import { isSameDay } from './useTransactions';

export function buildDailySummary(transactions: Transaction[], now = Date.now()): {
  text: string;
  income: number;
  expense: number;
} {
  const today = transactions.filter((t) => isSameDay(t.createdAt, now));
  let income = 0;
  let expense = 0;
  for (const t of today) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const cash = today
    .filter((t) => t.mode === 'cash')
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
  const upi = today
    .filter((t) => t.mode === 'upi')
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  const lines: string[] = [];
  lines.push('*Bachat-Bol — Daily Summary*');
  lines.push(new Date(now).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  }));
  lines.push('');
  lines.push(`Income: Rs ${income}`);
  lines.push(`Expense: Rs ${expense}`);
  lines.push(`Net Profit: Rs ${income - expense}`);
  lines.push(`Cash in hand: Rs ${cash}`);
  lines.push(`UPI total: Rs ${upi}`);

  if (today.length > 0) {
    lines.push('');
    lines.push('Entries:');
    for (const t of today) {
      const arrow = t.type === 'income' ? '+' : '-';
      const meta = CATEGORY_META[t.category] ?? CATEGORY_META.other;
      lines.push(`${meta.emoji} ${arrow}Rs ${t.amount} (${t.mode.toUpperCase()}) ${meta.label}`);
    }
  }

  return { text: lines.join('\n'), income, expense };
}

export function openWhatsAppSummary(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
