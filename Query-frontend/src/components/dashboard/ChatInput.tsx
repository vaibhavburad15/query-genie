// src/components/ChatInput.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Send, Loader2 } from 'lucide-react';
import { sendChatMessage, ChatRequestPayload } from '@/services/api';
import { useChatSession } from '@/hooks/useChatSession';


// Define the shape of a chat message
export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

// Define the props that the parent component must provide
interface ChatInputProps {
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isConnected: boolean;
}

const ChatInput = ({ chatHistory, setChatHistory, isLoading, setIsLoading, isConnected }: ChatInputProps) => {
  const { renameCurrentChat } = useChatSession();
  const [message, setMessage] = useState('');
  const isFirstUserMessage = chatHistory.filter(
  (msg) => msg.role === "user"
   ).length === 0;

  console.log("Is first user message:", isFirstUserMessage);
  const API_BASE = "http://localhost:8000";

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!message.trim() || isLoading || !isConnected) return;

  const userMessage: ChatMessage = { role: 'user', content: message };
  // ✅ STEP 4: Set chat title from first user message
// ✅ STEP 4: Rename chat from first user message
if (isFirstUserMessage) {
  const title =
    message.length > 40
      ? message.slice(0, 40) + "..."
      : message;

  renameCurrentChat(title);
}
setChatHistory(prev => [...prev, userMessage]);
  setIsLoading(true);
  setMessage('');

  try {
    const payload: ChatRequestPayload = {
      question: message,
      chat_history: chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
    };

    const data = await sendChatMessage(payload);

    if (data.success) {
      const aiMessage: ChatMessage = { role: 'ai', content: data.response };
      setChatHistory(prevHistory => [...prevHistory, aiMessage]);
    } else {
      const errorMessage: ChatMessage = { role: 'ai', content: `Error: ${data.error}` };
      setChatHistory(prevHistory => [...prevHistory, errorMessage]);
    }

  } catch (error) {
    console.error("Failed to send message:", error);
    const errorMessage: ChatMessage = { role: 'ai', content: 'Sorry, an unexpected error occurred.' };
    setChatHistory(prevHistory => [...prevHistory, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};


 const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (e.key === "Enter" && e.shiftKey) {
    // allow new line
    return;
  }

  if (e.key === "Enter" && !e.shiftKey) {
    // prevent new line, let form submit handle it
    e.preventDefault();
  }
};


  return (
    <div className="bg-#010514-800 p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? "Ask me anything about your data..." : "Please connect to a database first"}
            className="w-full min-h-[3rem] max-h-32 resize-none p-3 pr-24 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            disabled={isLoading || !isConnected}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isLoading || !isConnected}
            >
              <Plus size={18} />
            </Button>
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 bg-blue-600 hover:bg-blue-700"
              disabled={!message.trim() || isLoading || !isConnected}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </form>
    </div>
  );
};

export default ChatInput;