import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useChatSession } from '@/hooks/useChatSession';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatInput from '@/components/dashboard/ChatInput';
import ChatWindow from '@/components/dashboard/ChatWindow';
import UserProfile from '@/components/dashboard/UserProfile';
import Logo from '@/components/Logo';
import { DatabaseConnectionModal } from '@/components/dashboard/DatabaseConnectionModal';

const DashboardPage = () => {
  const { toast } = useToast();
  const {
    chatSessions,
    currentChatId,
    messages,
    createNewChat,
    selectChat,
    deleteChat,
    setMessages,
  } = useChatSession();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handleConnectSuccess = () => {
    setIsConnected(true);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleNewChat = async () => {
    try {
      await createNewChat();
      toast({
        title: "New Chat Started",
        description: "Ask a question to begin.",
      });
    } catch (error) {
      toast({
        title: "Error creating new chat",
        description: "Could not create new chat session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChatSelect = (chatId: number) => {
    selectChat(chatId);
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await deleteChat(chatId);
      toast({
        title: "Chat Deleted",
        description: "Chat session has been deleted.",
      });
    } catch (error) {
      toast({
        title: "Error deleting chat",
        description: "Could not delete chat session. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isConnected={isConnected}
          onOpenModal={handleOpenModal}
          onNewChat={handleNewChat}
          chatSessions={chatSessions}
          currentChatId={currentChatId}
          onChatSelect={handleChatSelect}
          onDeleteChat={handleDeleteChat}
        />

        <div className="flex-1 flex flex-col relative">
          <header className="flex items-center justify-between p-4 border-b border-border bg-surface">
            <Logo size="lg" />
            <UserProfile />
          </header>

          <ChatWindow
            messages={messages.map((msg, idx) => ({
              ...msg,
              id: (msg as any).id ?? String(idx),
              type: (msg as any).type ?? (msg.role === 'user' ? 'user' : 'assistant'),
              timestamp: (msg as any).timestamp ?? new Date().toISOString(),
            }))}
            onConnectDatabase={handleOpenModal}
          />

          <ChatInput
            chatHistory={messages}
            setChatHistory={setMessages}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            isConnected={isConnected}
          />
        </div>
      </div>

      <DatabaseConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnectSuccess={handleConnectSuccess}
      />
    </div>
  );
};

export default DashboardPage;
