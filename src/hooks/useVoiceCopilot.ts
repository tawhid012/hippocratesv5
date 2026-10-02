"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface CustomWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export function useVoiceCopilot() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up audio analyser
  const stopAudioAnalyser = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Clean up timer
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Stop everything
  const stopListening = useCallback((): string => {
    setIsListening(false);
    stopTimer();
    stopAudioAnalyser();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore if already stopped
      }
    }

    const fullTranscript = (transcript + " " + interimTranscript).trim();
    setInterimTranscript("");
    return fullTranscript;
  }, [transcript, interimTranscript, stopTimer, stopAudioAnalyser]);

  const cancelListening = useCallback(() => {
    setIsListening(false);
    stopTimer();
    stopAudioAnalyser();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    setTranscript("");
    setInterimTranscript("");
    setDuration(0);
    setError(null);
  }, [stopTimer, stopAudioAnalyser]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    setInterimTranscript("");
    setDuration(0);

    // 1. Request microphone access first
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj.name === "NotAllowedError" || errorObj.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone access in your browser to use Oracle Voice Copilot.");
      } else {
        setError("Could not access your microphone. Please check your audio input settings.");
      }
      return;
    }

    // 2. Setup Audio Visualizer
    try {
      const win = window as unknown as CustomWindow;
      const AudioCtx = win.AudioContext || win.webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(1, avg / 80));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }
    } catch {
      // AudioContext visualization is non-critical
    }

    // 3. Start Duration Timer
    timerIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // 4. Setup Speech Recognition
    const win = window as unknown as CustomWindow;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError("Speech recognition is not supported in this browser. You can type clinical notes or paste transcripts directly.");
      setIsListening(true);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let currentInterim = "";
        let newFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            newFinal += res[0].transcript + " ";
          } else {
            currentInterim += res[0].transcript;
          }
        }

        if (newFinal) {
          setTranscript((prev) => (prev + " " + newFinal).trim());
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          setError("Microphone permission was denied. Please allow microphone access in browser settings.");
          stopListening();
        } else if (event.error === "no-speech") {
          // No speech detected, keep listening quietly
        } else if (event.error === "network") {
          setError("Network issue during voice capture. Please check your internet connection.");
        }
      };

      recognition.onend = () => {
        // If still listening state, restart seamlessly (e.g. on long pause)
        if (recognitionRef.current && isListening) {
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setError("Unable to start voice recognition. Please try again or type directly.");
      stopListening();
    }
  }, [isListening, stopListening]);

  useEffect(() => {
    return () => {
      stopAudioAnalyser();
      stopTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [stopAudioAnalyser, stopTimer]);

  return {
    isListening,
    transcript,
    interimTranscript,
    duration,
    audioLevel,
    error,
    startListening,
    stopListening,
    cancelListening,
    clearError: () => setError(null),
  };
}
