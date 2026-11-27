import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BookOpenText,
  IndianRupee,
  Loader2,
  Mic,
  MicOff,
  Settings,
  Smartphone,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react';
import { SettingsDialog } from '@/components/SettingsDialog';
import { getGeminiKey, parseWithGemini, saveGeminiKey } from '@/lib/gemini';
import { parseEntry, type ParsedEntry } from '@/lib/parser';
import { speak } from '@/lib/speak';
import { isSameDay, useTransactions } from '@/lib/useTransactions';
import { useSpeech } from '@/lib/useSpeech';
import { buildDailySummary, openWhatsAppSummary } from '@/lib/whatsapp';
import { CATEGORY_META, type Transaction } from '@/lib/types';

const SAMPLES = [
  { label: 'Earned 350 UPI from ride', text: 'Earned 350 UPI from ride' },
  { label: 'Spent 120 cash on petrol', text: 'Spent 120 cash on petrol' },
  { label: 'Earned 200 cash from sales', text: 'Earned 200 cash from sales' },
];

function formatRs(n: number): string {
  const rounded = Math.round(Math.abs(n));
  return rounded.toLocaleString('en-IN');
}

function StatCard({
  label,
  value,
  tone,
  icon,
  sub,
}: {
  label: string;
  value: string;
  tone: 'net' | 'cash' | 'upi';
  icon: React.ReactNode;
  sub?: string;
}) {
  const tones = {
    net: 'from-emerald-500 to-teal-600 text-white',
    cash: 'bg-white text-slate-900 border border-slate-200',
    upi: 'bg-white text-slate-900 border border-slate-200',
  } as const;
  const iconTone = {
    net: 'text-emerald-100',
    cash: 'text-amber-500',
    upi: 'text-sky-600',
  } as const;
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm ${tones[tone]} ${
        tone === 'net' ? 'col-span-2 bg-gradient-to-br' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${iconTone[tone]} ${
          tone === 'net' ? 'text-emerald-100/90' : 'text-slate-500'
        }`}>
          {label}
        </span>
        <span className={iconTone[tone]}>{icon}</span>
      </div>
      <p className="mt-2 flex items-baseline text-2xl font-bold leading-none">
        <span className="mr-0.5 text-base font-semibold opacity-70">₹</span>
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${tone === 'net' ? 'text-emerald-50/90' : 'text-slate-500'}`}>{sub}</p>
      )}
    </div>
  );
}

function TransactionRow({ tx, onDelete }: { tx: Transaction; onDelete: () => void }) {
  const income = tx.type === 'income';
  const meta = CATEGORY_META[tx.category] ?? CATEGORY_META.other;
  const time = new Date(tx.createdAt).toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">
        {meta.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {meta.label}
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {tx.mode === 'unknown' ? 'unspecified' : tx.mode.toUpperCase()}
          </span>
        </p>
        <p className="truncate text-xs text-slate-500">{time} · {tx.note}</p>
      </div>
      <span
        className={`flex shrink-0 items-center gap-0.5 text-sm font-bold tabular-nums ${
          income ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {income ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
        ₹{formatRs(tx.amount)}
      </span>
      <button
        onClick={onDelete}
        aria-label="Delete entry"
        className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

export default function BachatBol() {
  const { transactions, addTransaction, deleteTransaction } = useTransactions();
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(getGeminiKey);
  const [parsing, setParsing] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const applyParsed = useCallback(
    (trimmed: string, parsed: ParsedEntry) => {
      addTransaction({ ...parsed, note: trimmed });
      const label = `${parsed.type === 'income' ? 'Income' : 'Expense'} ₹${formatRs(parsed.amount)} · ${CATEGORY_META[parsed.category].label} · ${parsed.mode.toUpperCase()}`;
      setToast(label);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
      speak(
        parsed.type === 'income'
          ? `Added ${parsed.amount} rupees income, ${CATEGORY_META[parsed.category].label}, ${parsed.mode === 'unknown' ? '' : parsed.mode}.`
          : `Added ${parsed.amount} rupees expense, ${CATEGORY_META[parsed.category].label}, ${parsed.mode === 'unknown' ? '' : parsed.mode}.`
      );
    },
    [addTransaction]
  );

  const handleEntry = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const key = getGeminiKey();
      if (key) {
        setParsing(true);
        try {
          const parsed = await parseWithGemini(trimmed, key);
          setParseError(null);
          applyParsed(trimmed, parsed);
          setParsing(false);
          return;
        } catch (err) {
          setParsing(false);
          const message = err instanceof Error ? err.message : 'Gemini failed.';
          const fallback = parseEntry(trimmed);
          if (fallback) {
            applyParsed(trimmed, fallback);
            setParseError(`${message} Entry saved with the built-in parser — double-check it.`);
            return;
          }
          setParseError(message);
          return;
        }
      }
      const parsed = parseEntry(trimmed);
      if (!parsed) {
        setParseError('Could not find an amount. Try saying it like "Earned 350 cash from sales".');
        return;
      }
      setParseError(null);
      applyParsed(trimmed, parsed);
    },
    [applyParsed]
  );

  const { status, interim, error, start, stop, dismissError } = useSpeech(handleEntry);
  const listening = status === 'listening';

  const today = useMemo(
    () => transactions.filter((t) => isSameDay(t.createdAt, Date.now())),
    [transactions]
  );

  const stats = useMemo(() => {
    let income = 0, expense = 0, cash = 0, upi = 0;
    for (const t of today) {
      const sign = t.type === 'income' ? 1 : -1;
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
      if (t.mode === 'cash') cash += sign * t.amount;
      else if (t.mode === 'upi') upi += sign * t.amount;
    }
    return { income, expense, net: income - expense, cash, upi };
  }, [today]);

  const summary = useMemo(() => buildDailySummary(transactions, Date.now()), [transactions]);

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    handleEntry(text);
    setText('');
  };

  const micHint = listening
    ? interim || 'Listening… speak now'
    : status === 'unsupported'
      ? 'Voice not supported in this browser — type below instead'
      : 'Tap the mic and say: "Earned 350 UPI from ride"';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-emerald-600 to-teal-700 px-5 pb-6 pt-7 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpenText className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Bachat-Bol</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              {today.length} {today.length === 1 ? 'entry' : 'entries'} today
            </span>
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className={`rounded-full p-2 transition hover:bg-white/20 active:scale-95 ${
                apiKey ? 'text-white' : 'text-emerald-100'
              }`}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-emerald-50/90">Bolo aur hisaab ho gaya — speak, and it's recorded.</p>
      </header>

      <main className="flex-1 space-y-5 px-4 pt-5">
        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard
            label="Net Profit (Today)"
            value={formatRs(stats.net)}
            tone="net"
            icon={<IndianRupee className="h-5 w-5" />}
            sub={`+₹${formatRs(stats.income)} in · −₹${formatRs(stats.expense)} out`}
          />
          <StatCard
            label="Cash in Hand"
            value={formatRs(stats.cash)}
            tone="cash"
            icon={<Wallet className="h-5 w-5" />}
          />
          <StatCard
            label="UPI Total"
            value={formatRs(stats.upi)}
            tone="upi"
            icon={<Smartphone className="h-5 w-5" />}
          />
        </section>

        {/* Sample buttons + mic */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Try a sample
            </p>
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                apiKey ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              {apiKey ? 'Gemini on' : 'Gemini off'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.text}
                onClick={() => handleEntry(s.text)}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col items-center">
            <button
              onClick={listening ? stop : start}
              aria-label={listening ? 'Stop listening' : 'Start listening'}
              className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${
                listening
                  ? 'bg-rose-500 shadow-rose-300'
                  : 'bg-emerald-600 shadow-emerald-300 hover:bg-emerald-700'
              } ${status === 'unsupported' ? 'opacity-40' : ''}`}
              disabled={status === 'unsupported'}
            >
              {listening && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/50" />
                  <span className="absolute -inset-2 animate-pulse rounded-full bg-rose-300/20" />
                </>
              )}
              {listening ? <MicOff className="relative h-10 w-10" /> : <Mic className="relative h-10 w-10" />}
            </button>
            <p className={`mt-3 flex h-5 items-center gap-1.5 max-w-full truncate text-sm font-medium ${listening ? 'text-rose-600' : 'text-slate-600'}`}>
              {parsing && <Loader2 className="h-4 w-4 animate-spin" />}
              {parsing ? 'Understanding your entry…' : micHint}
            </p>
          </div>

          {/* Text fallback */}
          <form onSubmit={submitText} className="mt-4 flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Or type it… e.g. Spent 80 UPI on food"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-95"
            >
              Add
            </button>
          </form>

          {parseError && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{parseError}</p>
          )}
          {error && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span>{error}</span>
              <button onClick={dismissError} className="font-semibold underline">OK</button>
            </div>
          )}
        </section>

        {/* WhatsApp summary */}
        <button
          onClick={() => openWhatsAppSummary(summary.text)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-base font-bold text-white shadow-md transition hover:brightness-105 active:scale-[0.98]"
        >
          <Banknote className="h-5 w-5" />
          Send Daily Summary on WhatsApp
        </button>

        {/* Transactions */}
        <section>
          <h2 className="mb-2 px-1 text-sm font-bold text-slate-700">Today's entries</h2>
          {today.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400">
              No entries yet today. Tap a sample above or speak into the mic.
            </p>
          ) : (
            <ul className="space-y-2">
              {[...today].reverse().map((t) => (
                <TransactionRow key={t.id} tx={t} onDelete={() => deleteTransaction(t.id)} />
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-20 mx-auto w-fit max-w-[90vw] rounded-full bg-slate-900 px-5 py-2.5 text-center text-sm font-medium text-white shadow-xl">
          Saved: {toast}
        </div>
      )}

      <SettingsDialog
        open={settingsOpen}
        apiKey={apiKey}
        onClose={() => setSettingsOpen(false)}
        onSave={(key) => {
          setApiKey(key);
          saveGeminiKey(key);
        }}
      />
    </div>
  );
}
