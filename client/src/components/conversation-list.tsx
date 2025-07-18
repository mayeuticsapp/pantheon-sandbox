import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, MessageSquare, Code, Download, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { conversationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { ConversationWithParticipants, Personality } from "@shared/schema";

interface ConversationListProps {
  conversations: ConversationWithParticipants[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  personalities: Personality[];
}

export default function ConversationList({ conversations, selectedId, onSelect, personalities }: ConversationListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [newConvTitle, setNewConvTitle] = useState("");
  const [newConvInstructions, setNewConvInstructions] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  // Project specific states
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectRequirements, setProjectRequirements] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: conversationsApi.create,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsCreateOpen(false);
      setNewConvTitle("");
      setNewConvInstructions("");
      setSelectedParticipants([]);
      onSelect(newConversation.id);
      toast({
        title: "Conversazione creata",
        description: "Nuova conversazione creata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare la conversazione",
        variant: "destructive",
      });
    },
  });

  const buildMutation = useMutation({
    mutationFn: async ({ conversationId, ...buildData }: any) => {
      const response = await fetch(`/api/conversations/${conversationId}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildData)
      });
      if (!response.ok) throw new Error('Build failed');
      return response.json();
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", variables.conversationId] });
      setIsProjectOpen(false);
      setProjectName("");
      setProjectDescription("");
      setProjectRequirements("");
      onSelect(variables.conversationId);
      toast({
        title: "🎉 Progetto Completato!",
        description: `${result.filesGenerated} file generati da AI Team: Geppo, Claude3, Mistral`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Build Fallito",
        description: error.message || "Errore durante la generazione del progetto",
        variant: "destructive",
      });
    },
  });

  const handleCreateConversation = () => {
    if (!newConvTitle.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un titolo per la conversazione",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      title: newConvTitle,
      instructions: newConvInstructions,
      participantIds: selectedParticipants,
      isActive: true,
      autoContinue: false,
      autoContinueRounds: 3,
    });
  };

  const handleCreateProject = async () => {
    if (!projectName.trim() || !projectDescription.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci nome e descrizione del progetto",
        variant: "destructive",
      });
      return;
    }

    // First create a build conversation
    const buildConversation = await conversationsApi.create({
      title: `🚀 ${projectName}`,
      instructions: `Progetto AI collaborativo: ${projectDescription}`,
      participantIds: ["geppo", "claude3", "mistral"], // All 3 AI builders
      type: "build",
      projectName,
      projectDescription,
      buildStatus: "pending",
      isActive: true,
      autoContinue: false,
      autoContinueRounds: 3,
    });

    // Start the build process
    const requirements = projectRequirements
      .split('\n')
      .filter(req => req.trim())
      .map(req => req.replace(/^[-*•]\s*/, '').trim());

    buildMutation.mutate({
      conversationId: buildConversation.id,
      projectName,
      description: projectDescription,
      requirements
    });
  };

  const toggleParticipant = (nameId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(nameId) 
        ? prev.filter(id => id !== nameId)
        : [...prev, nameId]
    );
  };

  const getPersonalityColor = (nameId: string) => {
    switch (nameId) {
      case "geppo": return "bg-geppo";
      case "claude3": return "bg-c24";
      case "mistral": return "bg-mistral";
      default: return "bg-orange-500";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Adesso";
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ore fa`;
    return `${Math.floor(diffMins / 1440)} giorni fa`;
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-visible">Conversazioni & Progetti</h2>
            <div className="flex gap-2">
              {/* Chat Dialog */}
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="text-xs sm:text-sm px-2 sm:px-3"
                    data-testid="create-conversation-button"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Chat</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crea Nuova Conversazione</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Titolo Conversazione</label>
                      <Input
                        value={newConvTitle}
                        onChange={(e) => setNewConvTitle(e.target.value)}
                        placeholder="es. Discussione Architettura AI"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Istruzioni per le AI</label>
                      <Textarea
                        value={newConvInstructions}
                        onChange={(e) => setNewConvInstructions(e.target.value)}
                        placeholder="Scrivi istruzioni specifiche per guidare il comportamento delle AI in questa conversazione..."
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Le AI leggeranno queste istruzioni e le seguiranno durante la conversazione
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Partecipanti AI</label>
                      <div className="space-y-2">
                        {personalities && personalities.length > 0 ? (
                          personalities.map((personality) => (
                            <div key={personality.nameId} className="flex items-center space-x-2">
                              <Checkbox
                                id={personality.nameId}
                                checked={selectedParticipants.includes(personality.nameId)}
                                onCheckedChange={() => toggleParticipant(personality.nameId)}
                              />
                              <label htmlFor={personality.nameId} className="text-sm font-medium cursor-pointer">
                                {personality.displayName}
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Caricamento personalità...</p>
                        )}
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateConversation} 
                      disabled={createMutation.isPending}
                      className="w-full bg-geppo hover:bg-blue-700"
                    >
                      {createMutation.isPending ? "Creazione..." : "Crea Conversazione"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Project Dialog */}
              <Dialog open={isProjectOpen} onOpenChange={setIsProjectOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="button-visible text-xs sm:text-sm px-2 sm:px-3"
                    data-testid="create-project-button"
                  >
                    <Code className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Nuovo Progetto</span>
                    <span className="sm:hidden">Progetto</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>🚀 Crea Nuovo Progetto AI</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Nome Progetto</label>
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="es. E-commerce Shop, Landing Page, Portfolio"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Descrizione</label>
                      <Textarea
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        placeholder="Descrivi cosa vuoi costruire..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Requirements (uno per riga)</label>
                      <Textarea
                        value={projectRequirements}
                        onChange={(e) => setProjectRequirements(e.target.value)}
                        placeholder="- Design moderno e responsive&#10;- Sistema di autenticazione&#10;- Database per utenti&#10;- Interfaccia mobile-friendly"
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        🤖 <strong>AI Team</strong>: Geppo (architettura), Claude3 (UI/UX), Mistral (business logic)
                      </p>
                    </div>
                    <Button 
                      onClick={handleCreateProject} 
                      disabled={buildMutation.isPending}
                      className="w-full bg-gradient-to-r from-geppo to-mistral hover:from-blue-700 hover:to-purple-700"
                    >
                      {buildMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          AI Team sta costruendo...
                        </>
                      ) : (
                        <>
                          <Code className="h-4 w-4 mr-2" />
                          Avvia Build Collaborativo
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {conversations.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Nessuna conversazione attiva</p>
              <p className="text-xs mt-1">Crea una nuova conversazione per iniziare</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedId === conversation.id ? "bg-blue-50 border-r-4 border-geppo" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-visible truncate">
                    {conversation.title}
                  </h3>
                  
                  {/* Project indicators */}
                  <div className="flex items-center gap-2">
                    {conversation.buildStatus && (
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        conversation.buildStatus === 'completed' ? 'bg-green-100 text-green-700' :
                        conversation.buildStatus === 'building' ? 'bg-yellow-100 text-yellow-700' :
                        conversation.buildStatus === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {conversation.buildStatus === 'completed' && '✅ Completato'}
                        {conversation.buildStatus === 'building' && '🔄 Building'}
                        {conversation.buildStatus === 'failed' && '❌ Fallito'}
                        {conversation.buildStatus === 'pending' && '⏳ Pendente'}
                      </div>
                    )}
                    
                    {conversation.type === 'build' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/api/conversations/${conversation.id}/download`, '_blank');
                        }}
                        disabled={conversation.buildStatus !== 'completed'}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {conversation.participants && conversation.participants.length > 0 ? (
                      conversation.participants.map((participant) => (
                        <div
                          key={participant.nameId}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white text-xs ${getPersonalityColor(participant.nameId)}`}
                          title={participant.displayName}
                        >
                          {participant.displayName.charAt(0)}
                        </div>
                      ))
                    ) : (
                      <Users className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(new Date(conversation.updatedAt))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            🧠 <strong>PantheonSandbox</strong> - AI Team Collaborativo: Geppo, Claude3, Mistral
          </p>
        </div>
      </CardContent>
    </Card>
  );
}