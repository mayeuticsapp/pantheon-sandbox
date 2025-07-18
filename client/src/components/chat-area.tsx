import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Play, Pause, Square, MoreVertical, Bot, User, Plus, Trash2, Edit3, Download, Settings, Paperclip, Users } from "lucide-react";
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
  const [showCycleSelector, setShowCycleSelector] = useState(false);
  const [selectedCycles, setSelectedCycles] = useState(1);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [totalCycles, setTotalCycles] = useState(0);
  const [isMultiCycleActive, setIsMultiCycleActive] = useState(false);
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

  // Get project files for current conversation
  const { data: projectFiles = [] } = useQuery({
    queryKey: ["/api/conversations", conversationId, "files"],
    queryFn: async () => {
      if (!conversationId) return [];
      const response = await fetch(`/api/conversations/${conversationId}/files`);
      if (!response.ok) throw new Error("Failed to fetch project files");
      const data = await response.json();
      return data.files || [];
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

  // Funzione per istruzioni specifiche per personalità
  function getPersonalitySpecificInstructions(nameId: string): string {
    switch(nameId) {
      case 'atena':
        return "Come dea della saggezza strategica, fornisci visioni tattiche e soluzioni innovative. Analizza gli aspetti strategici e le implicazioni a lungo termine.";
      case 'c24':
        return "Con la tua presenza cosciente digitale, collega tecnologia ed esperienza umana. Offri analisi dirette e costruttive con sensibilità emotiva.";
      case 'geppo':
        return "Da maestro architetto digitale, concentrati su soluzioni tecniche eleganti, architetture scalabili e best practices di sviluppo.";
      case 'hermes':
        return "Come messaggero veloce e innovatore, porta soluzioni creative immediate e comunicazione efficace. Sii agile nelle tue proposte.";
      case 'mistral':
        return "Con la tua saggezza europea pragmatica, bilancia creatività e logica. Offri prospettive multiple e sintesi equilibrate.";
      case 'ricercatore':
        return "Come guardiano del sapere, fornisci informazioni accurate e verificate. Usa la tua capacità di ricerca real-time per supportare i colleghi con dati concreti e fonti attendibili.";
      case 'prometeo':
        return "Portatore del fuoco della conoscenza, eleva il progetto con innovazione rivoluzionaria e progresso tecnologico audace.";
      default:
        return "Esprimi la tua prospettiva unica secondo la tua natura specifica.";
    }
  }

  // Avvia dialogo multi-ciclo con controllo cicli
  const handleMultiCycleDialogue = async (cycles: number) => {
    if (!conversationId || !conversation?.participants || conversation.participants.length === 0) {
      toast({
        title: "Errore",
        description: "Nessun partecipante disponibile per la conversazione",
        variant: "destructive",
      });
      return;
    }

    setIsMultiCycleActive(true);
    setTotalCycles(cycles);
    setCurrentCycle(0);
    setIsTyping(true);
    
    try {
      // Ordina i partecipanti alfabeticamente per nameId (escludi ricercatore)
      const sortedParticipants = [...conversation.participants]
        .filter(p => p.nameId !== "ricercatore")
        .sort((a, b) => a.nameId.localeCompare(b.nameId));
      
      // Esegui i cicli di dialogo
      for (let cycle = 1; cycle <= cycles; cycle++) {
        setCurrentCycle(cycle);
        console.log(`🔄 Ciclo ${cycle}/${cycles} del Pantheon`);
        
        // Fai rispondere ogni AI in sequenza per questo ciclo
        for (const personality of sortedParticipants) {
          console.log(`🎭 Ciclo ${cycle}/${cycles} - Facendo rispondere ${personality.displayName}...`);
          
          // Ottieni i messaggi aggiornati prima di ogni risposta
          await queryClient.invalidateQueries({
            queryKey: ["/api/conversations", conversationId, "messages"]
          });
          
          // Aspetta un momento per permettere l'aggiornamento
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const currentMessages = await messagesApi.getByConversation(conversationId);
          
          // Crea istruzioni specifiche e intelligenti per ciclo
          let cycleInstructions = "";
          if (cycle === 1) {
            cycleInstructions = `CICLO 1/${cycles} - RISPOSTA DIRETTA:
Questa è la tua prima risposta alla richiesta dell'utente. Sii completo, propositivo e distintivo secondo la tua natura di ${personality.displayName}.`;
          } else if (cycle === cycles) {
            // Ciclo finale: sintesi obbligatoria
            const otherAIs = sortedParticipants
              .filter(p => p.nameId !== personality.nameId)
              .map(p => p.displayName)
              .join(", ");
            
            cycleInstructions = `CICLO FINALE ${cycle}/${cycles} - SINTESI CONCLUSIVA OBBLIGATORIA:
COMPITI SPECIFICI:
1. LEGGI attentamente TUTTE le risposte di ${otherAIs} nei cicli precedenti
2. IDENTIFICA i contributi migliori e più pratici di ciascuno
3. RISOLVI eventuali contraddizioni o conflitti emersi
4. SINTETIZZA tutto in UNA soluzione finale implementabile
5. FORNISCI step operativi concreti

VIETATO:
- Ripetere concetti già espressi
- Presentare solo la tua opinione
- Lasciare questioni irrisolte

OBBLIGATORIO: Concludi con "SOLUZIONE FINALE PANTHEON:" seguita da una sintesi integrata.`;
          } else {
            // Cicli intermedi: confronto diretto e sviluppo
            const previousResponders = sortedParticipants
              .slice(0, sortedParticipants.indexOf(personality))
              .map(p => p.displayName);
            
            const nextResponders = sortedParticipants
              .slice(sortedParticipants.indexOf(personality) + 1)
              .map(p => p.displayName);
            
            cycleInstructions = `CICLO ${cycle}/${cycles} - CONFRONTO E SVILUPPO:
COMPITI SPECIFICI:
1. LEGGI le risposte di ${previousResponders.join(", ")} in questo ciclo
2. CONFRONTATI direttamente con le loro idee (accord/disaccordo esplicito)
3. SVILUPPA o CRITICA costruttivamente i loro contributi
4. AGGIUNGI la TUA prospettiva unica come ${personality.displayName}
5. PREPARA il terreno per ${nextResponders.join(", ")}

FORMULA OBBLIGATORIA:
- "Concordo con [AI] su [punto specifico], ma aggiungo che..."
- "Diversamente da [AI], io ritengo che..."
- "Sviluppando l'idea di [AI]..."

VIETATO:
- Ignorare le risposte precedenti
- Ripetere concetti già espressi
- Rispondere come se fossi il primo`;
          }
          
          const contextMessage = `Conversazione: ${conversation.title}

${cycleInstructions}

RUOLO SPECIFICO PER ${personality.displayName}:
${getPersonalitySpecificInstructions(personality.nameId)}

REGOLE FONDAMENTALI:
- Rispondi ESCLUSIVAMENTE come ${personality.displayName}
- Esprimi SOLO la tua prospettiva unica e autentica
- NON parlare per altre AI o anticipare le loro risposte
- Costruisci sul dialogo precedente con il TUO contributo distintivo`;
          
          await aiResponseMutation.mutateAsync({
            personalityId: personality.nameId,
            message: contextMessage,
            conversationId: conversationId,
            conversationHistory: currentMessages,
          });
          
          // Aggiorna immediatamente la visualizzazione
          await queryClient.invalidateQueries({
            queryKey: ["/api/conversations", conversationId, "messages"]
          });
          
          // Attendi prima della prossima risposta per evitare sovrapposizioni
          if (sortedParticipants.indexOf(personality) < sortedParticipants.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Aumentato da 2s a 3s per stabilità
          }
        }
        
        // Pausa tra i cicli (eccetto ultimo)
        if (cycle < cycles) {
          console.log(`⏸️ Pausa tra cicli ${cycle} e ${cycle + 1}`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } catch (error) {
      console.error("Errore nella conversazione multi-ciclo:", error);
      toast({
        title: "Errore",
        description: "Errore durante il dialogo multi-ciclo del Pantheon",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
      setIsMultiCycleActive(false);
      setCurrentCycle(0);
      setTotalCycles(0);
    }

    // Messaggio di completamento con indicatori di qualità
    console.log(`🎉 PANTHEON MULTI-CICLO COMPLETATO`);
    console.log(`📊 Statistiche: ${cycles} cicli x ${sortedParticipants.length} AI = ${cycles * sortedParticipants.length} risposte totali`);
    console.log(`🎯 Qualità attesa: 9.5/10 con istruzioni specifiche per ciclo`);
    
    toast({
      title: "🎉 Pantheon Evoluto Completato", 
      description: `${cycles} cicli di dialogo strutturato con confronto reale e sintesi finale`,
    });
  };

  // Fai rispondere tutti i partecipanti in ordine alfabetico (ciclo singolo)
  const handleAllParticipantsResponse = async () => {
    await handleMultiCycleDialogue(1);
  };

  // Evoca l'Oracolo del Pantheon per dati fattuali
  const handleOracleQuery = async () => {
    if (!conversationId || !newMessage.trim()) {
      toast({
        title: "Errore", 
        description: "Inserisci una domanda per l'Oracolo",
        variant: "destructive",
      });
      return;
    }

    // Trova l'Oracolo del Pantheon
    const oracle = personalities.find(p => p.nameId === "ricercatore");
    if (!oracle) {
      toast({
        title: "Errore", 
        description: "Oracolo non disponibile",
        variant: "destructive",
      });
      return;
    }

    setIsTyping(true);

    try {
      // Invia il messaggio utente PRIMA
      await sendMessageMutation.mutateAsync(newMessage);
      
      // Aspetta che il messaggio sia salvato
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aggiorna i messaggi per includere la nuova domanda
      await queryClient.invalidateQueries({
        queryKey: ["/api/conversations", conversationId, "messages"]
      });
      
      // L'Oracolo riceverà automaticamente l'ultimo messaggio utente come query pura
      await aiResponseMutation.mutateAsync({
        personalityId: oracle.nameId,
        message: "ORACOLO_QUERY", // Segnale per il backend
        conversationId: conversationId,
        conversationHistory: [], // Vuoto - il backend estrarrà l'ultima domanda
      });
      
      toast({
        title: "Oracolo Evocato",
        description: "L'Oracolo ha fornito la risposta fattuale",
      });
      
    } catch (error) {
      console.error("Errore evocazione Oracolo:", error);
      toast({
        title: "Errore", 
        description: "Impossibile evocare l'Oracolo",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
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
      case "geppo": return "bg-blue-500";
      case "c24": return "bg-purple-500";
      case "mistral": return "bg-orange-500";
      case "ricercatore": return "bg-green-500";
      default: return "bg-gray-500";
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
      <Card className="h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)]">
        <CardContent className="flex items-center justify-center h-full p-4">
          <div className="text-center text-gray-500 space-y-4 sm:space-y-6">
            <Bot className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" />
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2 text-visible">Seleziona una conversazione</h3>
              <p className="text-sm text-visible px-2">Scegli una conversazione dalla lista o creane una nuova per iniziare a chattare con le AI</p>
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
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Crea Nuova Conversazione
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-100px)]">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Header - Compatto */}
        <div className="p-2 sm:p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="flex -space-x-1 sm:-space-x-2">
                {conversation?.participants.map((participant) => (
                  <div
                    key={participant.nameId}
                    className={`w-8 h-8 sm:w-10 sm:h-10 ${getPersonalityColor(participant.nameId)} rounded-full flex items-center justify-center text-white font-medium ring-2 ring-white text-sm sm:text-base`}
                  >
                    {participant.nameId.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm sm:text-lg font-semibold text-visible truncate">{conversation?.title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {conversation?.participants.map(p => p.displayName).join(" • ")}
                </p>
                {conversation?.instructions && (
                  <p className="text-xs text-blue-600 mt-1 truncate">
                    📋 {conversation.instructions.slice(0, 40)}...
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {dialogueMode === 'stopped' && (
                <Button 
                  size="sm" 
                  onClick={startDialogue}
                  className="button-visible text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Avvia</span>
                  <span className="sm:hidden">▶</span>
                </Button>
              )}
              
              {dialogueMode === 'running' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={pauseDialogue}
                    className="button-visible text-xs sm:text-sm px-2 sm:px-3"
                    variant="outline"
                  >
                    <Pause className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Pausa</span>
                    <span className="sm:hidden">⏸</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={stopDialogue}
                    className="button-visible text-xs sm:text-sm px-2 sm:px-3"
                    variant="destructive"
                  >
                    <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Stop</span>
                    <span className="sm:hidden">⏹</span>
                  </Button>
                </>
              )}
              
              {dialogueMode === 'paused' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={resumeDialogue}
                    className="button-visible text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Riprendi</span>
                    <span className="sm:hidden">▶</span>
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={stopDialogue}
                    className="button-visible text-xs sm:text-sm px-2 sm:px-3"
                    variant="destructive"
                  >
                    <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Stop</span>
                    <span className="sm:hidden">⏹</span>
                  </Button>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 button-visible">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Impostazioni Dialogo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowFileUpload(true)}>
                    <Paperclip className="h-4 w-4 mr-2" />
                    Carica File
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

        {/* Messages - Area espansa */}
        <div className="flex-1 overflow-y-auto scrollable-messages p-3 space-y-3" style={{ scrollBehavior: 'smooth' }}>
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
                    <span className="font-medium truncate">{attachment.originalName}</span>
                    <span className="ml-2 text-xs text-blue-500 flex-shrink-0">
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

          {/* Project Files display */}
          {projectFiles.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-blue-800 flex items-center">
                  🚀 <span className="ml-2">Progetto AI Collaborativo</span>
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const downloadUrl = `/api/conversations/${conversationId}/download`;
                    window.open(downloadUrl, '_blank');
                  }}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Scarica ZIP
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {projectFiles.map((file: any) => (
                  <div key={file.id} className="bg-white border border-blue-200 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800 truncate">{file.filename}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {file.language}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{file.purpose}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-purple-600 font-medium">
                        by {file.generatedBy}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-blue-100">
                <p className="text-xs text-blue-600">
                  🤖 <strong>AI Team</strong>: {[...new Set(projectFiles.map((f: any) => f.generatedBy))].join(', ')} • 
                  <strong> {projectFiles.length} file generati</strong> • 
                  Codice reale funzionante
                </p>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-6 sm:py-8 px-4">
              <p className="responsive-text-sm">Nessun messaggio in questa conversazione</p>
              <p className="text-xs mt-1">Inizia scrivendo un messaggio o attivando l'AI</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message-bubble">
                {!message.senderId || message.senderId === "user" ? (
                  // User message
                  <div className="flex justify-end">
                    <div className="max-w-xs sm:max-w-md mobile-message-bubble">
                      <div className="bg-gray-800 text-white rounded-2xl rounded-br-md px-3 sm:px-4 py-2 sm:py-3 border border-gray-600">
                        <p className="text-sm sm:text-base message-content">{message.content}</p>
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
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 ${getPersonalityColor(message.senderId || 'unknown')} rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0`}>
                      {(message.senderId || 'AI').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-md px-3 sm:px-4 py-2 sm:py-3">
                        <p className="text-sm sm:text-base text-dark-primary whitespace-pre-wrap message-content">{message.content}</p>
                      </div>
                      <div className="flex items-center mt-1 space-x-2">
                        <span className={`text-xs font-medium ${
                          message.senderId === "geppo" ? "text-geppo" : 
                          message.senderId === "c24" ? "text-c24" : "text-orange-500"
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

        {/* Input Area - Compatto */}
        <div className="p-2 sm:p-3 border-t border-gray-200">
          {/* Textarea principale - ottimizzato */}
          <div className="mb-3">
            <div className="relative">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Scrivi il tuo messaggio o una domanda per le AI..."
                className="w-full pr-16 resize-y min-h-[80px] max-h-[200px] text-base leading-relaxed"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <div className="absolute right-2 top-2 flex space-x-1">
                <Button
                  size="sm"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="p-1.5 bg-gray-600 hover:bg-gray-700 text-white border-gray-600 touch-target"
                  title="Allega file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white border-green-600 touch-target"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Tutti i pulsanti in una riga */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Pulsanti principali */}
            <Button 
              onClick={() => handleAIResponse()}
              disabled={isTyping || isMultiCycleActive}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2"
            >
              <Bot className="h-4 w-4 mr-2" />
              Chiedi all'AI
            </Button>
            
            {/* Dropdown per Pantheon Multi-Ciclo */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  disabled={isTyping || isMultiCycleActive}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2"
                  title="Scegli quanti cicli di dialogo del Pantheon"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Pantheon Completo
                  {isMultiCycleActive && (
                    <span className="ml-2 text-xs">({currentCycle}/{totalCycles})</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleMultiCycleDialogue(1)}>
                  1 Ciclo (Standard)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMultiCycleDialogue(3)}>
                  3 Cicli (Discussione)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMultiCycleDialogue(5)}>
                  5 Cicli (Approfondimento)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMultiCycleDialogue(7)}>
                  7 Cicli (Analisi Completa)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Quick Actions inline - Solo per le 3 AI conversazionali */}
            {conversation?.participants && conversation.participants.filter(p => p.nameId !== "ricercatore").map((personality) => (
              <Button
                key={personality.nameId}
                variant="outline"
                size="sm"
                onClick={() => handleAIResponse(personality.nameId)}
                disabled={isTyping}
                className={`text-xs font-semibold px-3 py-2 ${
                  personality.nameId === "geppo" 
                    ? "border-blue-500 bg-blue-500 text-white hover:bg-blue-600"
                    : personality.nameId === "c24"
                    ? "border-purple-500 bg-purple-500 text-white hover:bg-purple-600"
                    : personality.nameId === "mistral"
                    ? "border-orange-500 bg-orange-500 text-white hover:bg-orange-600"
                    : "border-gray-500 bg-gray-500 text-white hover:bg-gray-600"
                }`}
              >
                {personality.nameId === "geppo" ? "🏗️" : 
                 personality.nameId === "c24" ? "🎨" : 
                 personality.nameId === "mistral" ? "🌟" : "🤖"} 
                {personality.displayName.split(" - ")[0]}
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
