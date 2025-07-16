import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: conversationsApi.create,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsCreateOpen(false);
      setNewConvTitle("");
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
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-visible">Conversazioni Attive</h2>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="button-visible"
                  data-testid="create-conversation-button"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuova Conversazione
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
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Nessuna conversazione attiva</p>
              <p className="text-xs mt-1">Crea una nuova conversazione per iniziare</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedId === conversation.id ? "bg-blue-50 border-r-2 border-geppo" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex -space-x-2">
                    {conversation.participants.map((participant) => (
                      <div
                        key={participant.nameId}
                        className={`w-8 h-8 ${getPersonalityColor(participant.nameId)} rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white`}
                      >
                        {participant.nameId.charAt(0).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-dark-primary truncate">
                        {conversation.title}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {conversation.updatedAt && formatTimeAgo(new Date(conversation.updatedAt))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
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