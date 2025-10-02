import { useState, useEffect } from 'react';
import { getChatSessions, createChatSession, updateChatSession, deleteChatSession } from '@/services/api';
import { ChatMessage } from '@/components/dashboard/ChatInput';

export function useChatSession() {
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    loadChatSessions();
  }, []);

  useEffect(() => {
    if (currentChatId !== null) {
      persistMessages();
    }
  }, [messages]);

  const loadChatSessions = async () => {
    try {
      const sessions = await getChatSessions();
      setChatSessions(sessions);
      if (sessions.length > 0) {
        setCurrentChatId(sessions[0].id);
        setMessages(sessions[0].messages);
      }
    } catch (error) {
      console.error("Error loading chat sessions", error);
    }
  };

  const createNewChat = async () => {
    try {
      const newSession = await createChatSession({ title: "New Chat", messages: [] });
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentChatId(newSession.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating new chat session", error);
    }
  };

  const selectChat = (chatId: number) => {
    const selectedSession = chatSessions.find(session => session.id === chatId);
    if (selectedSession) {
      setCurrentChatId(chatId);
      setMessages(selectedSession.messages);
    }
  };

  const persistMessages = async () => {
    if (currentChatId === null) return;
    try {
      await updateChatSession(currentChatId, { messages });
      setChatSessions(prev =>
        prev.map(session =>
          session.id === currentChatId ? { ...session, messages } : session
        )
      );
    } catch (error) {
      console.error("Failed to update chat session messages", error);
    }
  };

  const deleteChat = async (chatId: number) => {
    try {
      await deleteChatSession(chatId);
      setChatSessions(prev => prev.filter(session => session.id !== chatId));
      if (currentChatId === chatId) {
        const remaining = chatSessions.filter(session => session.id !== chatId);
        if (remaining.length > 0) {
          setCurrentChatId(remaining[0].id);
          setMessages(remaining[0].messages);
        } else {
          setCurrentChatId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Error deleting chat session", error);
    }
  };

  return {
    chatSessions,
    currentChatId,
    messages,
    createNewChat,
    selectChat,
    deleteChat,
    setMessages,
  };
}
