import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Play, MoreVertical, Bot, User, Plus, Trash2, Edit3, Download, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { messagesApi, chatApi, conversationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { MessageWithSender, Personality } from "@shared/schema";

interface ChatAreaProps {
  conversationId: number | null;
  personalities: Personality[];
}

export default function ChatArea({ conversationId, personalities }: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [autoContinueActive, setAutoContinueActive] = useState(false);
  const [autoContinueRounds, setAutoContinueRounds] = useState(3);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get conversation details
  const { data: conversation } = useQuery({
    queryKey: ["/api/conversations", conversationId],
    queryFn: () => conversationId ? conversationsApi.getById(conversationId) : null,
    enabled: !!conversationId,
  });

  // Get messages for current conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: () => conversationId ? messagesApi.getByConversation(conversationId) : [],
    enabled: !!conversationId,
  });

  // Send user message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      messagesApi.create(conversationId!, {
        senderId: "user",
        content,
        messageType: "text",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setNewMessage("");
    },
  });

  // AI response mutation
  const aiResponseMutation = useMutation({
    mutationFn: chatApi.sendMessage,
    onSuccess: (data, variables) => {
      // Create AI message
      messagesApi.create(conversationId!, {
        senderId: variables.personalityId,
        content: data.response,
        messageType: "text",
        metadata: data.metadata,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        setIsTyping(false);
      });
    },
    onError: (error) => {
      toast({
        title: "Errore AI",
        description: `Impossibile ottenere risposta dall'AI: ${error.message}`,
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    try {
      await sendMessageMutation.mutateAsync(newMessage);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio",
        variant: "destructive",
      });
    }
  };

  const handleAIResponse = async (personalityNameId?: string) => {
    if (!conversationId || !conversation) return;

    // Determine which AI should respond
    let targetPersonality: string;
    if (personalityNameId) {
      targetPersonality = personalityNameId;
    } else {
      // Get last AI that spoke, then pick the next one
      const lastAIMessage = messages.filter(m => m.senderId !== "user").pop();
      const availableAIs = conversation.participantIds || [];
      
      if (lastAIMessage?.senderId && availableAIs.includes(lastAIMessage.senderId)) {
        const currentIndex = availableAIs.indexOf(lastAIMessage.senderId);
        const nextIndex = (currentIndex + 1) % availableAIs.length;
        targetPersonality = availableAIs[nextIndex];
      } else {
        targetPersonality = availableAIs[0] || "geppo";
      }
    }

    setIsTyping(true);

    try {
      await aiResponseMutation.mutateAsync({
        personalityId: targetPersonality,
        message: messages.length > 0 ? messages[messages.length - 1].content : "Inizia la conversazione",
        conversationId: conversationId,
        conversationHistory: messages,
      });
    } catch (error) {
      setIsTyping(false);
    }
  };

  const handleAutoContinue = async () => {
    if (!conversation || autoContinueActive) return;

    setAutoContinueActive(true);
    const rounds = autoContinueRounds;

    try {
      for (let i = 0; i < rounds; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay between messages
        await handleAIResponse();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for response
      }
      
      toast({
        title: "Auto-Continue completato!",
        description: `${rounds} round di conversazione completati con successo.`,
      });
    } catch (error) {
      toast({
        title: "Auto-Continue interrotto",
        description: "Si è verificato un errore durante l'auto-continue",
        variant: "destructive",
      });
    } finally {
      setAutoContinueActive(false);
    }
  };

  const getPersonalityColor = (nameId: string) => {
    switch (nameId) {
      case "geppo": return "bg-geppo";
      case "c24": return "bg-c24";
      default: return "bg-orange-500";
    }
  };

  const getPersonalityName = (nameId: string) => {
    const personality = personalities.find(p => p.nameId === nameId);
    return personality?.displayName || nameId;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!conversationId) {
    return (
      <Card className="h-[calc(100vh-180px)]">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 space-y-6">
            <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <div>
              <h3 className="text-lg font-medium mb-2 text-visible">Seleziona una conversazione</h3>
              <p className="text-sm text-visible">Scegli una conversazione dalla lista o creane una nuova per iniziare a chattare con le AI</p>
            </div>
            <div className="pt-4">
              <Button 
                onClick={() => {
                  // Trigger create conversation modal from conversation list
                  const createButton = document.querySelector('[data-testid="create-conversation-button"]') as HTMLButtonElement;
                  if (createButton) {
                    createButton.click();
                  }
                }}
                className="button-visible"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crea Nuova Conversazione
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-180px)]">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2">
                {conversation?.participants.map((participant) => (
                  <div
                    key={participant.nameId}
                    className={`w-10 h-10 ${getPersonalityColor(participant.nameId)} rounded-full flex items-center justify-center text-white font-medium ring-2 ring-white`}
                  >
                    {participant.nameId.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-visible">{conversation?.title}</h3>
                <p className="text-sm text-gray-500">
                  {conversation?.participants.map(p => p.displayName).join(" • ")}
                </p>
                {conversation?.instructions && (
                  <p className="text-xs text-blue-600 mt-1">
                    📋 Istruzioni: {conversation.instructions.slice(0, 60)}...
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                onClick={handleAutoContinue}
                disabled={autoContinueActive}
                className="button-visible"
              >
                <Play className="h-4 w-4 mr-1" />
                {autoContinueActive ? "In corso..." : "Auto-Continue"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="button-visible">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    const conversationText = `${conversation?.title}\n\n${messages.map(m => 
                      `${m.senderId === 'user' ? 'Tu' : getPersonalityName(m.senderId!)}: ${m.content}`
                    ).join('\n\n')}`;
                    navigator.clipboard.writeText(conversationText);
                    toast({ title: "Conversazione copiata!", description: "Il testo è stato copiato negli appunti" });
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Esporta conversazione
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    toast({ title: "Modifica", description: "Funzionalità in arrivo!" });
                  }}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Modifica conversazione
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      if (window.confirm("Sei sicuro di voler eliminare questa conversazione? Questa azione non può essere annullata.")) {
                        conversationsApi.delete(conversation!.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
                          window.location.href = "/";
                          toast({ title: "Conversazione eliminata", description: "La conversazione è stata eliminata con successo" });
                        }).catch(() => {
                          toast({ title: "Errore", description: "Impossibile eliminare la conversazione", variant: "destructive" });
                        });
                      }
                    }}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina conversazione
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">Nessun messaggio in questa conversazione</p>
              <p className="text-xs mt-1">Inizia scrivendo un messaggio o attivando l'AI</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message-bubble">
                {message.senderId === "user" ? (
                  // User message
                  <div className="flex justify-end">
                    <div className="max-w-md">
                      <div className="bg-dark-primary text-white rounded-2xl rounded-br-md px-4 py-3">
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <div className="flex items-center justify-end mt-1 space-x-2">
                        <span className="text-xs text-gray-500">Tu</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">
                          {formatTime(new Date(message.createdAt!))}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // AI message
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 ${getPersonalityColor(message.senderId!)} rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                      {message.senderId!.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                        <p className="text-sm text-dark-primary whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className={`text-xs font-medium ${
                          message.senderId === "geppo" ? "text-geppo" : "text-c24"
                        }`}>
                          {getPersonalityName(message.senderId!)}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">
                          {formatTime(new Date(message.createdAt!))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="typing-indicator flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center animate-pulse">
                <Bot className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-200 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
                <div className="flex items-center mt-1 space-x-2">
                  <span className="text-xs text-gray-400">AI sta scrivendo...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Scrivi il tuo messaggio o una domanda per le AI..."
                  className="pr-12 resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 button-visible"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => handleAIResponse()}
              disabled={isTyping}
              className="button-visible"
            >
              <Bot className="h-4 w-4 mr-2" />
              Chiedi all'AI
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {conversation?.participants.map((personality) => (
              <Button
                key={personality.nameId}
                variant="outline"
                size="sm"
                onClick={() => handleAIResponse(personality.nameId)}
                disabled={isTyping}
                className={`text-xs button-visible ${
                  personality.nameId === "geppo" 
                    ? "border-geppo/20 bg-geppo/10 text-geppo hover:bg-geppo/20"
                    : "border-c24/20 bg-c24/10 text-c24 hover:bg-c24/20"
                }`}
              >
                {personality.nameId === "geppo" ? "🏗️" : "🎨"} Chiedi a {personality.displayName.split(" - ")[0]}
              </Button>
            ))}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={autoContinueActive || isTyping}
                  className="text-xs border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  ⚡ Auto-Continue ({autoContinueRounds} round)
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Configurazione Auto-Continue</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rounds">Numero di round</Label>
                    <Input
                      id="rounds"
                      type="number"
                      min="1"
                      max="10"
                      value={autoContinueRounds}
                      onChange={(e) => setAutoContinueRounds(parseInt(e.target.value) || 3)}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500">
                      Imposta quanti turni di conversazione AI devono essere eseguiti automaticamente.
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                      Annulla
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        handleAutoContinue();
                      }}
                      disabled={autoContinueActive || isTyping}
                      className="button-visible"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Avvia Auto-Continue
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
