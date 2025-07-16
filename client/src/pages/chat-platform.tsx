import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Users, Plug } from "lucide-react";
import { conversationsApi, personalitiesApi, providersApi } from "@/lib/api";
import ConversationList from "@/components/conversation-list";
import ChatArea from "@/components/chat-area";
import PersonalityManager from "@/components/personality-manager";
import ProviderManager from "@/components/provider-manager";

type Tab = "conversations" | "personalities" | "providers";

export default function ChatPlatform() {
  const [activeTab, setActiveTab] = useState<Tab>("conversations");
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);

  // Data queries
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: conversationsApi.getAll,
  });

  const { data: personalities = [] } = useQuery({
    queryKey: ["/api/personalities"],
    queryFn: personalitiesApi.getAll,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["/api/providers"],
    queryFn: providersApi.getAll,
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case "conversations":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ConversationList
                conversations={conversations}
                selectedId={selectedConversationId}
                onSelect={setSelectedConversationId}
                personalities={personalities}
              />
            </div>
            <div className="lg:col-span-2">
              <ChatArea
                conversationId={selectedConversationId}
                personalities={personalities}
              />
            </div>
          </div>
        );
      case "personalities":
        return <PersonalityManager personalities={personalities} providers={providers} />;
      case "providers":
        return <ProviderManager providers={providers} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-geppo to-c24 rounded-lg flex items-center justify-center">
                  <Bot className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-dark-primary">AI Chat Platform</h1>
                  <p className="text-xs text-gray-500">Gestione Conversazioni Intelligenti</p>
                </div>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-1">
              <button
                onClick={() => setActiveTab("conversations")}
                className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                  activeTab === "conversations"
                    ? "bg-geppo text-white"
                    : "text-gray-600 hover:text-dark-primary hover:bg-gray-100"
                }`}
              >
                <Bot className="inline mr-2 h-4 w-4" />
                Conversazioni 
                <span className={`px-2 py-1 rounded text-xs ml-2 ${
                  activeTab === "conversations" ? "bg-white/20" : "bg-gray-200"
                }`}>
                  {conversations.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("personalities")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "personalities"
                    ? "bg-geppo text-white"
                    : "text-gray-600 hover:text-dark-primary hover:bg-gray-100"
                }`}
              >
                <Users className="inline mr-2 h-4 w-4" />
                Personalità 
                <span className={`px-2 py-1 rounded text-xs ml-2 ${
                  activeTab === "personalities" ? "bg-white/20" : "bg-gray-200"
                }`}>
                  {personalities.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("providers")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "providers"
                    ? "bg-geppo text-white"
                    : "text-gray-600 hover:text-dark-primary hover:bg-gray-100"
                }`}
              >
                <Plug className="inline mr-2 h-4 w-4" />
                Provider 
                <span className={`px-2 py-1 rounded text-xs ml-2 ${
                  activeTab === "providers" ? "bg-white/20" : "bg-gray-200"
                }`}>
                  {providers.length}
                </span>
              </button>
            </nav>

            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-connection rounded-full animate-pulse-soft"></div>
                <span>Sistema Attivo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden px-4 pb-3">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab("conversations")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                activeTab === "conversations"
                  ? "bg-geppo text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Bot className="inline h-4 w-4" />
              <span className="ml-1">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab("personalities")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                activeTab === "personalities"
                  ? "bg-geppo text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Users className="inline h-4 w-4" />
              <span className="ml-1">AI</span>
            </button>
            <button
              onClick={() => setActiveTab("providers")}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg ${
                activeTab === "providers"
                  ? "bg-geppo text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Plug className="inline h-4 w-4" />
              <span className="ml-1">API</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderTabContent()}
      </main>
    </div>
  );
}
