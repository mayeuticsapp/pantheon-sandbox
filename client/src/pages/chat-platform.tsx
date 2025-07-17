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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
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
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-geppo to-c24 rounded-lg flex items-center justify-center">
                  <Bot className="text-white text-sm md:text-lg" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg md:text-xl font-bold text-visible">AI Chat Platform</h1>
                  <p className="text-xs text-gray-500 hidden md:block">Gestione Conversazioni Intelligenti</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-base font-bold text-visible">Pantheon</h1>
                </div>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              <button
                onClick={() => {
                  setActiveTab("conversations");
                  setSelectedConversationId(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                  activeTab === "conversations"
                    ? "button-visible"
                    : "text-visible hover:bg-gray-100 border border-gray-300"
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
                onClick={() => {
                  setActiveTab("personalities");
                  setSelectedConversationId(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                  activeTab === "personalities"
                    ? "button-visible"
                    : "text-visible hover:bg-gray-100 border border-gray-300"
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
                onClick={() => {
                  setActiveTab("providers");
                  setSelectedConversationId(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                  activeTab === "providers"
                    ? "button-visible"
                    : "text-visible hover:bg-gray-100 border border-gray-300"
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
              <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-connection rounded-full animate-pulse-soft"></div>
                <span>Sistema Attivo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden px-2 pb-3 border-t border-gray-100">
          <div className="flex space-x-1">
            <button
              onClick={() => {
                setActiveTab("conversations");
                setSelectedConversationId(null);
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "conversations"
                  ? "bg-geppo text-white shadow-md"
                  : "text-gray-600 bg-gray-100 border border-gray-200"
              }`}
            >
              <Bot className="inline h-4 w-4" />
              <span className="ml-1">Chat</span>
              <span className={`px-1 py-0.5 rounded text-xs ml-1 ${
                activeTab === "conversations" ? "bg-white/20" : "bg-gray-200"
              }`}>
                {conversations.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("personalities");
                setSelectedConversationId(null);
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "personalities"
                  ? "bg-geppo text-white shadow-md"
                  : "text-gray-600 bg-gray-100 border border-gray-200"
              }`}
            >
              <Users className="inline h-4 w-4" />
              <span className="ml-1">AI</span>
              <span className={`px-1 py-0.5 rounded text-xs ml-1 ${
                activeTab === "personalities" ? "bg-white/20" : "bg-gray-200"
              }`}>
                {personalities.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("providers");
                setSelectedConversationId(null);
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === "providers"
                  ? "bg-geppo text-white shadow-md"
                  : "text-gray-600 bg-gray-100 border border-gray-200"
              }`}
            >
              <Plug className="inline h-4 w-4" />
              <span className="ml-1">API</span>
              <span className={`px-1 py-0.5 rounded text-xs ml-1 ${
                activeTab === "providers" ? "bg-white/20" : "bg-gray-200"
              }`}>
                {providers.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6">
        {renderTabContent()}
      </main>
    </div>
  );
}
