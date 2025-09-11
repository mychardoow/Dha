import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ConversationSidebar from "@/components/chat/conversation-sidebar";
import ChatArea from "@/components/chat/chat-area";
import ContextPanel from "@/components/chat/context-panel";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function AIAssistantPage() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [contextVisible, setContextVisible] = useState(true);
  const [token] = useState(() => localStorage.getItem("auth_token"));

  const { isConnected, emit, on, off } = useWebSocket({ 
    token: token || undefined,
    autoConnect: !!token,
    enableToasts: false,
    enableEventHandlers: false
  });

  // Fetch conversations
  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ["/api/conversations"],
    enabled: !!token,
  });
  
  const conversations = Array.isArray(conversationsData) ? conversationsData : [];

  // Set initial conversation
  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations, currentConversationId]);

  // Handle conversation changes via WebSocket
  useEffect(() => {
    const handleNewConversation = () => {
      refetchConversations();
    };

    on("conversation:created", handleNewConversation);
    on("conversation:updated", handleNewConversation);

    return () => {
      off("conversation:created", handleNewConversation);
      off("conversation:updated", handleNewConversation);
    };
  }, [on, off, refetchConversations]);

  const handleNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "New Conversation"
        })
      });

      if (response.ok) {
        const newConversation = await response.json();
        setCurrentConversationId(newConversation.id);
        refetchConversations();
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
        }
        refetchConversations();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);
  const toggleContext = () => setContextVisible(!contextVisible);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please log in to access the AI Assistant.</p>
          <button 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            onClick={() => window.location.href = "/login"}
            data-testid="button-login"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" data-testid="page-ai-assistant">
      {/* Conversation Sidebar */}
      <div 
        className={`w-80 transition-transform duration-300 md:translate-x-0 ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar-conversations"
      >
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col" data-testid="area-main-chat">
        <ChatArea
          conversationId={currentConversationId}
          isConnected={isConnected}
          onToggleSidebar={toggleSidebar}
          onToggleContext={toggleContext}
          emit={emit}
          on={on}
          off={off}
        />
      </div>

      {/* Context Panel */}
      <div 
        className={`w-80 transition-transform duration-300 hidden lg:flex ${
          contextVisible ? "translate-x-0" : "translate-x-full"
        }`}
        data-testid="panel-context"
      >
        <ContextPanel 
          isConnected={isConnected}
          emit={emit}
          on={on}
          off={off}
        />
      </div>

      {/* Mobile Overlay */}
      {sidebarVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
          data-testid="overlay-mobile"
        />
      )}
    </div>
  );
}
