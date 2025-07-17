import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Play, Pause, Square, MoreVertical, Bot, User, Plus, Trash2, Edit3, Download, Settings, Paperclip } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { messagesApi, chatApi, conversationsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "./file-upload";
import type { MessageWithSender, Personality, Attachment } from "@shared/schema";

interface ChatAreaProps {
  conversationId: number | null;
  personalities: Personality[];
}

export default function ChatArea({ conversationId, personalities }: ChatAreaProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [dialogueMode, setDialogueMode] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [dialogueDelay, setDialogueDelay] = useState(8000); // 8 secondi tra i messaggi
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
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

  // Get attachments for current conversation
  const { data: attachments = [] } = useQuery({
    queryKey: ["/api/conversations", conversationId, "attachments"],
    queryFn: async () => {
      if (!conversationId) return [];
      const response = await fetch(`/api/conversations/${conversationId}/attachments`);
      if (!response.ok) throw new Error("Failed to fetch attachments");
      return response.json();
    },
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

  // Migliorata logica di alternanza AI
  const getNextAI = (): string => {
    if (!conversation?.participantIds || conversation.participantIds.length === 0) {
      return "geppo"; // fallback
    }

    const availableAIs = conversation.participantIds;
    
    // Trova l'ultimo messaggio AI (escludendo messaggi utente)
    const aiMessages = messages.filter(m => m.senderId !== "user");
    
    if (aiMessages.length === 0) {
      // Prima AI a parlare: prendi la prima della lista
      return availableAIs[0];
    }

    const lastAIMessage = aiMessages[aiMessages.length - 1];
    const currentAIIndex = availableAIs.indexOf(lastAIMessage.senderId!);
    
    if (currentAIIndex === -1) {
      // L'AI corrente non è nella lista dei partecipanti, prendi la prima
      return availableAIs[0];
    }

    // Cicla alla prossima AI
    const nextIndex = (currentAIIndex + 1) % availableAIs.length;
    return availableAIs[nextIndex];
  };

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
    const targetPersonality = personalityNameId || getNextAI();

    setIsTyping(true);

    try {
      // Passa il contesto completo della conversazione, non solo l'ultimo messaggio
      const contextMessage = messages.length > 0 
        ? `Conversazione attuale: ${conversation.title}\n\nIstruzioni: ${conversation.instructions || 'Nessuna istruzione specifica'}\n\nContinua naturalmente la conversazione seguendo le istruzioni.`
        : `Inizia la conversazione sul topic: ${conversation.title}\n\nIstruzioni: ${conversation.instructions || 'Nessuna istruzione specifica'}`;

      await aiResponseMutation.mutateAsync({
        personalityId: targetPersonality,
        message: contextMessage,
        conversationId: conversationId,
        conversationHistory: messages,
      });
    } catch (error) {
      setIsTyping(false);
    }
  };

  // Cleanup dialogue on unmount or conversation change
  useEffect(() => {
    return () => {
      if (dialogueMode === 'running') {
        setDialogueMode('stopped');
      }
    };
  }, [conversationId]);

  const startDialogue = () => {
    if (!conversation || dialogueMode === 'running') return;

    setDialogueMode('running');
    
    const runDialogue = async () => {
      try {
        // Aspetta che la risposta AI sia completata prima di programmare la successiva
        await handleAIResponse();
        
        // Aspetta un po' di più per essere sicuri che il messaggio sia salvato
        setTimeout(() => {
          if (dialogueMode === 'running') {
            runDialogue();
          }
        }, dialogueDelay);
      } catch (error) {
        console.error('Errore durante il dialogo automatico:', error);
        stopDialogue();
        toast({
          title: "Dialogo interrotto",
          description: "Si è verificato un errore durante il dialogo automatico",
          variant: "destructive",
        });
      }
    };

    // Inizia il primo ciclo
    runDialogue();
    
    toast({
      title: "Dialogo Avviato",
      description: "Le AI stanno ora conversando automaticamente",
    });
  };

  const pauseDialogue = () => {
    setDialogueMode('paused');
    
    toast({
      title: "Dialogo in Pausa",
      description: "Il dialogo automatico è stato messo in pausa",
    });
  };

  const stopDialogue = () => {
    setDialogueMode('stopped');
    
    toast({
      title: "Dialogo Fermato",
      description: "Il dialogo automatico è stato fermato",
    });
  };

  const resumeDialogue = () => {
    if (dialogueMode === 'paused') {
      startDialogue();
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
              {dialogueMode === 'stopped' && (
                <Button 
                  size="sm" 
                  onClick={startDialogue}
                  className="button-visible"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Avvia Dialogo
                </Button>
              )}
              
              {dialogueMode === 'running' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={pauseDialogue}
                    className="button-visible"
                    variant="outline"
                  >
                    <Pause className="h-4 w-4 mr-1" />
                    Pausa
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={stopDialogue}
                    className="button-visible"
                    variant="destructive"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                </>
              )}
              
              {dialogueMode === 'paused' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={resumeDialogue}
                    className="button-visible"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Riprendi
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={stopDialogue}
                    className="button-visible"
                    variant="destructive"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="button-visible">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Impostazioni Dialogo
                  </DropdownMenuItem>
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
          {/* File attachments display */}
          {attachments.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">📎 File condivisi nel Pantheon</h4>
              <div className="space-y-1">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center text-sm text-blue-700">
                    <span className="mr-2">
                      {attachment.mimeType.startsWith("text/") ? "📄" : 
                       attachment.mimeType.startsWith("image/") ? "🖼️" :
                       attachment.mimeType.includes("pdf") ? "📕" : "📎"}
                    </span>
                    <span className="font-medium">{attachment.originalName}</span>
                    <span className="ml-2 text-xs text-blue-500">
                      ({(attachment.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                ℹ️ Questi file sono disponibili per tutte le AI della conversazione
              </p>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">Nessun messaggio in questa conversazione</p>
              <p className="text-xs mt-1">Inizia scrivendo un messaggio o attivando l'AI</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message-bubble">
                {!message.senderId || message.senderId === "user" ? (
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
                          {message.createdAt ? formatTime(new Date(message.createdAt)) : 'Ora sconosciuta'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // AI message
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 ${getPersonalityColor(message.senderId || 'unknown')} rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                      {(message.senderId || 'AI').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-md px-4 py-3">
                        <p className="text-sm text-dark-primary whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className={`text-xs font-medium ${
                          message.senderId === "geppo" ? "text-geppo" : "text-c24"
                        }`}>
                          {getPersonalityName(message.senderId || 'unknown')}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">
                          {message.createdAt ? formatTime(new Date(message.createdAt)) : 'Ora sconosciuta'}
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

        {/* File Upload Section */}
        {showFileUpload && conversationId && (
          <div className="p-4 border-t border-gray-100">
            <FileUpload 
              conversationId={conversationId}
              attachments={attachments}
              onFileUploaded={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "attachments"] });
              }}
              onDeleteAttachment={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "attachments"] });
              }}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Scrivi il tuo messaggio o una domanda per le AI..."
                  className="pr-16 resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowFileUpload(!showFileUpload)}
                    className="p-1.5 button-visible"
                    title="Allega file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="p-1.5 button-visible"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
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

          </div>

          {/* Dialogue Settings Dialog */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Impostazioni Dialogo Infinito</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="delay">Intervallo tra messaggi (millisecondi)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={dialogueDelay}
                    onChange={(e) => setDialogueDelay(parseInt(e.target.value) || 4000)}
                    min="1000"
                    max="30000"
                    step="500"
                    className="w-32"
                  />
                  <p className="text-sm text-gray-500">
                    Imposta quanto tempo aspettare tra un messaggio e l'altro durante il dialogo automatico.
                    <br />
                    <strong>Consigliato:</strong> 8000ms (8 secondi) per dare tempo alle AI di elaborare completamente.
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-1">Come funziona il Dialogo Infinito:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Le AI si alternano automaticamente nei messaggi</li>
                    <li>• Puoi mettere in pausa o fermare in qualsiasi momento</li>
                    <li>• La conversazione continua finché non la fermi tu</li>
                    <li>• Perfetto per osservare dialoghi tra AI autentiche</li>
                  </ul>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                    Chiudi
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
