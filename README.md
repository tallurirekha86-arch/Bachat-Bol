# Bachat-Bol

**Bolo aur hisaab ho gaya** — speak, and your books are done.

Bachat-Bol is a voice-first personal finance app built for Indian gig workers and street vendors. Say a sentence like *"Earned 350 UPI from ride"* or *"Aaj 200 cash bikri"*, and the app pulls out the amount, whether money came in or went out, how it was paid (cash / UPI / card), and a category (fuel, food, sales, transport, rent, supplies, repairs, salary). Every entry is confirmed with a toast and spoken out loud, and one button sends a full daily summary to WhatsApp.

## Features

- **Voice-first entry** — large mic button using the browser's Web Speech API (Indian English), with a text-input fallback for unsupported browsers (works best in Chrome / Edge).
- **Offline parser, zero setup** — a built-in parser understands amounts, Hindi/Hinglish words like *kamaya* (earned) and *kharcha* (spent), payment modes (including GPay, PhonePe, Paytm), and categories. It runs entirely in the browser.
- **Optional AI parsing** — paste a Gemini API key in Settings (gear icon, top right) and messy Hinglish/Tenglish sentences are parsed by Gemini 2.5 Flash. The key is stored only on the device, and if Gemini is unreachable the app falls back to the offline parser automatically.
- **Dashboard** — today's Net Profit, Cash in Hand, and UPI Total, plus today's entry list with per-item delete.
- **WhatsApp daily summary** — one tap opens WhatsApp with a pre-written breakdown: income, expense, net profit, cash in hand, UPI total, and every entry listed.
- **Private by design** — all data stays in the browser's local storage. No accounts, no server, no database.

## Run with Docker (recommended for judging)

No `.env` file or API keys are needed — the app starts fully working with the offline parser:

```bash
docker compose up
```

Then open **http://localhost:3000**.

To stop: `docker compose down`.

## Run without Docker

```bash
npm install
npm run dev
```

## Optional: enable AI parsing

1. Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Either paste it into the app's Settings dialog (saved locally on the device), or copy `.env.example` to `.env` and set `VITE_GEMINI_API_KEY=your_key`.

The `.env.example` file documents the single optional variable:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## How the offline parser works (out of the box)

When no Gemini key is set, every entry is parsed locally in the browser:

1. **Amount** — finds numbers written with ₹, *rs*, *rupees*, *rupaye*, or plain digits, and expands spoken forms like *"hazaar"* (×1000) and *"sau"* (×100), plus common Hindi number words (*bees* = 20, *pachas* = 50…).
2. **Type** — income words (*earned, kamaya, mila, aaya, received, collected*) vs. expense words (*spent, kharcha, diya, bought, paid*).
3. **Mode** — UPI words (*upi, gpay, phone pe, paytm, scan, online*), card words, or cash words (*cash, naagad*).
4. **Category** — keyword rules for fuel (*petrol, diesel, CNG*), food (*khana, chai, tiffin*), transport (*ride, auto, bus, toll*), rent (*kiraya*), supplies (*saman, stock*), repairs (*puncture, mechanic*), salary, and sales (*bikri, order, delivery*).

If an amount can't be found, the app shows a friendly hint instead of saving a broken entry.

## Tech stack

Vite + React + TypeScript + Tailwind CSS, Web Speech API (recognition + synthesis), optional Google Gemini 2.5 Flash for parsing, data persisted in browser local storage.
