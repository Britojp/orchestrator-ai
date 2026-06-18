import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from "../components/ChatMessage";
import type { ChatMessageProps } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { Card } from '../components/Card';
import { Bot } from 'lucide-react';

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([
    { role: 'system', content: 'Conversation started.' },
    { role: 'assistant', content: 'Hello! I am your AI Development Assistant. What would you like to build today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I understand you want to: "${content}". I will create a plan for this.`
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-4rem)] p-4 flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">AI Workspace Chat</h1>
        <p className="text-sm text-gray-500">Discuss requirements, review plans, and execute code changes.</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 bg-gray-50">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} role={msg.role} content={msg.content} />
          ))}
          {isTyping && (
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
              <Bot className="w-4 h-4 animate-bounce" /> AI is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-200">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isTyping} />
        </div>
      </Card>
    </div>
  );
}
