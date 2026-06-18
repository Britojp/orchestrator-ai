import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from './Button';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center bg-white border border-gray-300 rounded-lg shadow-sm p-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message to the AI agent..."
        className="block w-full resize-none bg-transparent border-0 py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <div className="absolute right-2 bottom-2">
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          size="sm"
          className="rounded-full w-8 h-8 p-0 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
