import { useState, useEffect } from 'react';
import { getChatSessions, createChatSession, updateChatSession, deleteChatSession } from '@/services/api';
import { ChatMessage } from '@/components/dashboard/ChatInput';
import { useAuth } from '@/contexts/AuthContext';

export function useChatSession() {
  const { user, justLoggedIn, resetJustLoggedIn } = useAuth();
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user]);



  useEffect(() => {
    if (currentChatId !== null) {
      persistMessages();
    }
  }, [messages]);

  const loadChatSessions = async () => {
    if (!user) return;
    try {
      const sessions = await getChatSessions(user.id);
      console.log("Loaded chat sessions:", sessions);
      setChatSessions(sessions);
      if (sessions.length > 0 && !justLoggedIn) {
        setCurrentChatId(sessions[0].id);
        setMessages(sessions[0].messages);
      }
    } catch (error) {
      console.error("Error loading chat sessions", error);
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    try {
      const newSession = await createChatSession({ title: "New Chat", messages: [], user_id: user.id });
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
    if (currentChatId === null || !user) return;
    try {
      await updateChatSession(currentChatId, { messages, user_id: user.id });
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
    if (!user) return;
    try {
      await deleteChatSession(chatId, user.id);
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
const renameCurrentChat = (title: string) => {
  setChatSessions((prev) =>
    prev.map((chat) =>
      chat.id === currentChatId
        ? { ...chat, title }
        : chat
    )
  );
};

  return {
    chatSessions,
    currentChatId,
    messages,
    createNewChat,
    selectChat,
    deleteChat,
    setMessages,
    renameCurrentChat,
  };
}
