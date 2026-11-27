import { X } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  apiKey: string;
  onClose: () => void;
  onSave: (key: string) => void;
}

export function SettingsDialog({ open, apiKey, onClose, onSave }: SettingsDialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label htmlFor="gemini-key" className="mt-4 block text-sm font-semibold text-slate-700">
          Gemini API key <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="gemini-key"
          type="password"
          value={apiKey}
          onChange={(e) => onSave(e.target.value)}
          placeholder="Paste your key here"
          autoComplete="off"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          With a key, messy Hinglish and Tenglish sentences are understood far better using
          Google's Gemini Flash. The key stays saved on this device only. Get a free key at
          {' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-600 underline"
          >
            aistudio.google.com/apikey
          </a>
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
