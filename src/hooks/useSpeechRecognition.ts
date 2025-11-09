import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition() as SpeechRecognitionInstance;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.addEventListener("result", (event: Event) => {
      const e = event as SpeechRecognitionEvent;
      const current = e.resultIndex;
      const transcriptText = e.results[current][0].transcript;
      setTranscript(transcriptText);
    });

    recognition.addEventListener("end", () => {
      setIsListening(false);
    });

    recognition.addEventListener("error", (event: Event) => {
      const e = event as SpeechRecognitionErrorEvent;
      console.error("Speech recognition error:", e.error);
      setIsListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error("Voice input error. Please try again.");
      }
    });

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    setTranscript("");
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: !!recognitionRef.current,
  };
};
