import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined;

/**
 * Optional voice input via the browser's speech recognition (Chrome/Edge).
 * Text-only play never depends on it: unsupported browsers or mic errors just
 * report a message. Note: Chrome sends the audio to its speech service, so it
 * needs internet.
 */
export function useSpeechInput({ onText, lang = 'en-IN' }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognition = useRef(null);
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => () => recognition.current?.abort(), []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setMessage('Voice input unavailable. Please type your answer.');
      return;
    }
    try {
      const rec = new SpeechRecognition();
      rec.lang = lang;
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (event) => {
        const text = Array.from(event.results)
          .map((r) => r[0]?.transcript ?? '')
          .join(' ')
          .trim();
        if (text) onTextRef.current(text);
      };
      rec.onerror = (event) => {
        setMessage(
          event.error === 'not-allowed' ? 'Microphone blocked — please type your answer.' : 'Didn’t catch that. Try again or type it.',
        );
      };
      rec.onend = () => setListening(false);
      recognition.current = rec;
      setMessage('');
      setListening(true);
      rec.start();
    } catch {
      setListening(false);
      setMessage('Voice input unavailable. Please type your answer.');
    }
  }, [lang]);

  return { supported: Boolean(SpeechRecognition), listening, message, start, stop };
}
