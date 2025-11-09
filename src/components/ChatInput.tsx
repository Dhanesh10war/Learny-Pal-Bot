import { useState, useEffect } from "react";
import { Send, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (!isListening && transcript) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [isListening, transcript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? "Listening..." : "Ask me anything about your studies..."}
        disabled={disabled || isListening}
        className="min-h-[60px] max-h-[120px] resize-none rounded-2xl bg-muted border-border focus-visible:ring-primary"
        rows={1}
      />
      {isSupported && (
        <Button
          type="button"
          onClick={toggleVoiceInput}
          disabled={disabled}
          className={`rounded-full h-12 w-12 p-0 transition-all ${
            isListening 
              ? "bg-destructive hover:bg-destructive/90" 
              : "bg-secondary hover:bg-secondary/90"
          }`}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
      )}
      <Button
        type="submit"
        disabled={disabled || !input.trim()}
        className="rounded-full h-12 w-12 p-0 bg-gradient-primary hover:opacity-90 transition-opacity shadow-soft"
      >
        <Send className="w-5 h-5" />
      </Button>
    </form>
  );
};

export default ChatInput;
