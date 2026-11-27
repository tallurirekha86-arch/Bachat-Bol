import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechStatus = 'idle' | 'listening' | 'unsupported';

interface SpeechResult {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string }; length: number }>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return typeof Ctor === 'function' ? Ctor : null;
}

export function useSpeech(onResult: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>(() =>
    getRecognitionCtor() ? 'idle' : 'unsupported'
  );
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setStatus('unsupported');
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(interimText || finalText);
      if (finalText.trim()) {
        setInterim('');
        onResultRef.current(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      if (code === 'no-speech') setError("Didn't catch that — try again");
      else if (code === 'not-allowed' || code === 'service-not-allowed')
        setError('Microphone blocked. Allow mic access in your browser settings.');
      else if (code !== 'aborted') setError('Voice not recognised. Please try again.');
      setStatus('idle');
    };

    recognition.onend = () => {
      setStatus((s) => (s === 'listening' ? 'idle' : s));
      setInterim('');
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setError(null);
    setInterim('');
    try {
      recognition.start();
      setStatus('listening');
    } catch {
      // start() throws if already started — ignore
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* nothing to stop */
    }
    setStatus((s) => (s === 'listening' ? 'idle' : s));
  }, []);

  return { status, interim, error, start, stop, dismissError: () => setError(null) };
}
