import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, MessageSquare } from "lucide-react";
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
  const [newConvTitle, setNewConvTitle] = useState("");
  const [newConvInstructions, setNewConvInstructions] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
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
      case "c24": return "bg-c24";
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
            <h2 className="text-base sm:text-lg font-semibold text-visible">Conversazioni Attive</h2>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="button-visible text-xs sm:text-sm px-2 sm:px-3"
                  data-testid="create-conversation-button"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Nuova Conversazione</span>
                  <span className="sm:hidden">Nuova</span>
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
                className={`p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors touch-target ${
                  selectedId === conversation.id ? "bg-blue-50 border-r-2 border-geppo" : ""
                }`}
              >
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <div className="flex -space-x-1 sm:-space-x-2">
                    {conversation.participants.map((participant) => (
                      <div
                        key={participant.nameId}
                        className={`w-7 h-7 sm:w-8 sm:h-8 ${getPersonalityColor(participant.nameId)} rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white`}
                      >
                        {participant.nameId.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm sm:text-base font-medium text-dark-primary truncate">
                        {conversation.title}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {conversation.updatedAt && formatTimeAgo(new Date(conversation.updatedAt))}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 truncate mt-1">
                      {conversation.lastMessage 
                        ? `${conversation.lastMessage.senderId === "user" ? "Tu" : conversation.lastMessage.senderId}: ${conversation.lastMessage.content}`
                        : "Nessun messaggio"
                      }
                    </p>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="bg-geppo/10 text-geppo px-2 py-1 rounded text-xs">
                        {conversation.participants.length} partecipanti
                      </span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        {conversation.messageCount} messaggi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}