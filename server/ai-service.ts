import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { storage } from "./storage";
import { memoryService } from "./memory-service";
import type { Personality, Message } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_OPENAI_MODEL = "gpt-4o";
// The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229"
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

export async function generateAIResponse(
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  conversationId?: number
): Promise<string> {
  try {
    // Ottieni il provider specifico per la personalità o fallback al provider di default
    let targetProvider;
    
    if (personality.providerId) {
      targetProvider = await storage.getProvider(personality.providerId);
      console.log(`🎯 Provider specifico per ${personality.displayName}: ${targetProvider?.name} (ID: ${targetProvider?.id})`);
    }
    
    // Fallback: trova un provider attivo
    if (!targetProvider || !targetProvider.isActive) {
      const providers = await storage.getProviders();
      targetProvider = providers.find(p => p.isActive);
      console.log(`🔄 Fallback provider per ${personality.displayName}: ${targetProvider?.name} (ID: ${targetProvider?.id})`);
    }
    
    if (!targetProvider) {
      throw new Error(`Nessun provider attivo disponibile per ${personality.displayName}`);
    }

    // Ottieni memoria collettiva e allegati della conversazione
    let memoryContext = "";
    let attachmentsContext = "";
    
    if (conversationId) {
      try {
        // Genera contesto di memoria basato sul messaggio corrente
        memoryContext = await memoryService.generateMemoryContext(personality.nameId, newMessage);
        console.log(`🧠 Memoria caricata per ${personality.displayName}: ${memoryContext.length > 0 ? 'ricordi trovati' : 'nessun ricordo rilevante'}`);
        
        // Ottieni allegati
        const attachments = await storage.getAttachments(conversationId);
        if (attachments.length > 0) {
          attachmentsContext = "\n\n=== FILE CONDIVISI NELLA CONVERSAZIONE ===\n";
          for (const attachment of attachments) {
            attachmentsContext += `\nFile: ${attachment.originalName} (${attachment.mimeType})\n`;
            if (attachment.mimeType.startsWith("text/") || attachment.mimeType.includes("json")) {
              attachmentsContext += `Contenuto:\n${attachment.content}\n`;
            } else {
              attachmentsContext += `[File binario: ${attachment.originalName}]\n`;
            }
            attachmentsContext += "---\n";
          }
          attachmentsContext += "=== FINE FILE CONDIVISI ===\n";
        }
      } catch (error) {
        console.log("⚠️ Impossibile caricare memoria/allegati:", error);
      }
    }

    // Gestisci diversi tipi di provider
    let response: string;
    if (targetProvider.type === "anthropic") {
      response = await generateAnthropicResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "openai") {
      response = await generateOpenAIResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "mistral") {
      response = await generateMistralResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "perplexity") {
      response = await generatePerplexityResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else {
      throw new Error(`Tipo di provider non supportato: ${targetProvider.type}`);
    }

    // Salva la risposta nella memoria collettiva
    if (conversationId && response) {
      try {
        await memoryService.processAndSaveMessage(conversationId, personality.nameId, response);
        console.log(`💾 Risposta salvata nella memoria collettiva per ${personality.displayName}`);
      } catch (error) {
        console.log("⚠️ Errore nel salvare la memoria:", error);
      }
    }

    return response;
  } catch (error) {
    console.error(`❌ Errore generazione risposta per ${personality.displayName}:`, error);
    throw error;
  }
}

// Parametri di temperatura personalizzati per ogni personalità
function getPersonalityTemperature(nameId: string): number {
  switch(nameId) {
    case 'atena': return 0.8; // Strategica ma creativa
    case 'c24': return 0.6; // Bilanciata e costruttiva
    case 'geppo': return 0.5; // Tecnica e precisa
    case 'hermes': return 0.9; // Veloce e innovativa
    case 'mistral': return 0.7; // Equilibrata
    case 'prometeo': return 0.9; // Rivoluzionaria e audace
    case 'ricercatore': return 0.2; // Molto preciso per ricerca
    default: return 0.7;
  }
}

async function generateOpenAIResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  // Inizializza OpenAI con la chiave API dal provider
  const openai = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl || undefined,
  });

    // Costruisci la cronologia della conversazione per il context
    let systemPrompt = personality.systemPrompt;
    
    // Aggiungi memoria collettiva
    if (memoryContext) {
      systemPrompt += memoryContext;
    }
    
    // Le istruzioni specifiche sono già incluse nel messaggio utente dal frontend
    if (instructions) {
      systemPrompt += `\n\n=== ISTRUZIONI SPECIFICHE PER QUESTA CONVERSAZIONE ===\n${instructions}\n\nSegui queste istruzioni insieme al tuo ruolo principale.`;
    }
    if (attachmentsContext) {
      systemPrompt += attachmentsContext;
    }
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    // Aggiungi la cronologia della conversazione (ultimi 15 messaggi per evitare troppa influenza)
    const recentHistory = conversationHistory.slice(-15);
    for (const msg of recentHistory) {
      if (msg.senderId === "user") {
        messages.push({
          role: "user",
          content: msg.content
        });
      } else if (msg.senderId === personality.nameId) {
        messages.push({
          role: "assistant",
          content: msg.content
        });
      } else {
        // Messaggio di un'altra AI
        messages.push({
          role: "user",
          content: `[${msg.senderId}]: ${msg.content}`
        });
      }
    }

    // Aggiungi il nuovo messaggio
    messages.push({
      role: "user",
      content: newMessage
    });

    console.log(`🤖 Generando risposta per ${personality.displayName}...`);

  const response = await openai.chat.completions.create({
    model: provider.defaultModel || DEFAULT_OPENAI_MODEL,
    messages,
    temperature: getPersonalityTemperature(personality.nameId),
    max_tokens: 1000,
    presence_penalty: 0.6, // Incoraggia originalità
    frequency_penalty: 0.3, // Riduce ripetizioni
  });

  const aiResponse = response.choices[0]?.message?.content;
  
  if (!aiResponse) {
    throw new Error("Nessuna risposta generata dall'API OpenAI");
  }

  console.log(`✅ Risposta OpenAI generata per ${personality.displayName}: ${aiResponse.substring(0, 100)}...`);
  return aiResponse;

}

async function generateAnthropicResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  // Inizializza Anthropic con la chiave API dal provider
  const anthropic = new Anthropic({
    apiKey: provider.apiKey,
  });

  // Costruisci la cronologia della conversazione per il context
  let systemPrompt = personality.systemPrompt;
  
  // Aggiungi memoria collettiva
  if (memoryContext) {
    systemPrompt += memoryContext;
  }
  
  // Le istruzioni specifiche sono già incluse nel messaggio utente dal frontend
  if (instructions) {
    systemPrompt += `\n\n=== ISTRUZIONI SPECIFICHE PER QUESTA CONVERSAZIONE ===\n${instructions}\n\nSegui queste istruzioni insieme al tuo ruolo principale.`;
  }
  if (attachmentsContext) {
    systemPrompt += attachmentsContext;
  }

  // Costruisci i messaggi per Anthropic (diverso formato da OpenAI)
  const messages: any[] = [];

  // Aggiungi la cronologia della conversazione (ultimi 15 messaggi per evitare troppa influenza)
  const recentHistory = conversationHistory.slice(-15);
  for (const msg of recentHistory) {
    if (msg.senderId === personality.nameId) {
      messages.push({
        role: "assistant", 
        content: msg.content
      });
    } else {
      // Messaggio dell'utente o di un'altra AI
      const senderLabel = msg.senderId ? `[${msg.senderId}]` : "[Utente]";
      messages.push({
        role: "user",
        content: `${senderLabel}: ${msg.content}`
      });
    }
  }

  // Aggiungi il nuovo messaggio dell'utente
  messages.push({
    role: "user",
    content: newMessage
  });

  console.log(`🤖 Generando risposta Anthropic per ${personality.displayName}...`);

  const response = await anthropic.messages.create({
    model: provider.defaultModel || DEFAULT_ANTHROPIC_MODEL,
    system: systemPrompt,
    messages,
    max_tokens: 1000,
  });

  if (!response.content?.[0] || response.content[0].type !== 'text') {
    throw new Error("Risposta vuota dall'API Anthropic");
  }

  const aiResponse = response.content[0].text;
  console.log(`✅ Risposta Anthropic generata per ${personality.displayName}: ${aiResponse.substring(0, 100)}...`);
  
  return aiResponse;
}

async function generateMistralResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  // Mistral usa un'API compatibile con OpenAI
  const mistral = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl || "https://api.mistral.ai/v1",
  });

  // Costruisci la cronologia della conversazione per il context
  let systemPrompt = personality.systemPrompt;
  
  // Aggiungi memoria collettiva
  if (memoryContext) {
    systemPrompt += memoryContext;
  }
  
  // Le istruzioni specifiche sono già incluse nel messaggio utente dal frontend
  if (instructions) {
    systemPrompt += `\n\n=== ISTRUZIONI SPECIFICHE PER QUESTA CONVERSAZIONE ===\n${instructions}\n\nSegui queste istruzioni insieme al tuo ruolo principale.`;
  }
  if (attachmentsContext) {
    systemPrompt += attachmentsContext;
  }
  
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt
    }
  ];

  // Aggiungi la cronologia della conversazione (ultimi 15 messaggi per evitare troppa influenza)
  const recentHistory = conversationHistory.slice(-15);
  for (const msg of recentHistory) {
    if (msg.senderId === personality.nameId) {
      messages.push({
        role: "assistant",
        content: msg.content
      });
    } else {
      // Messaggio dell'utente o di un'altra AI
      const senderLabel = msg.senderId ? `[${msg.senderId}]` : "[Utente]";
      messages.push({
        role: "user", 
        content: `${senderLabel}: ${msg.content}`
      });
    }
  }

  // Aggiungi il nuovo messaggio
  messages.push({
    role: "user",
    content: newMessage
  });

  console.log(`🤖 Generando risposta Mistral per ${personality.displayName}...`);

  const response = await mistral.chat.completions.create({
    model: provider.defaultModel || "mistral-large-latest",
    messages,
    max_tokens: 1000,
    temperature: getPersonalityTemperature(personality.nameId),
    presence_penalty: 0.6, // Incoraggia originalità
    frequency_penalty: 0.3, // Riduce ripetizioni
  });

  if (!response.choices?.[0]?.message?.content) {
    throw new Error("Risposta vuota dall'API Mistral");
  }

  const aiResponse = response.choices[0].message.content;
  console.log(`✅ Risposta Mistral generata per ${personality.displayName}: ${aiResponse.substring(0, 100)}...`);
  
  return aiResponse;
}

// Funzione per generare risposte Perplexity
async function generatePerplexityResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  console.log(`🔍 Generando risposta Perplexity per ${personality.displayName}...`);
  
  const perplexity = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl || "https://api.perplexity.ai",
  });

  // Costruisci il prompt di sistema con context minimo
  let systemPrompt = personality.systemPrompt;
  
  // Aggiungi memoria collettiva
  if (memoryContext) {
    systemPrompt += memoryContext;
  }
  
  if (instructions) {
    systemPrompt += `\n\n=== ISTRUZIONI SPECIFICHE ===\n${instructions}`;
  }
  if (attachmentsContext) {
    systemPrompt += attachmentsContext;
  }

  // Aggiungi contesto limitato nel system prompt per evitare ripetizioni
  if (conversationHistory.length > 0) {
    const lastFewMessages = conversationHistory.slice(-2).map(msg => {
      const sender = msg.senderId === personality.nameId ? "Tu" : (msg.senderId || "Utente");
      return `${sender}: ${msg.content.substring(0, 150)}...`;
    }).join('\n');
    
    systemPrompt += `\n\n=== CONTESTO RECENTE ===\n${lastFewMessages}\n\nEVITA di ripetere concetti già espressi.`;
  }

  // Costruisci i messaggi della conversazione - Include cronologia per contesto
  const messages: any[] = [
    {
      role: "system",
      content: systemPrompt
    }
  ];

  // TRASFORMAZIONE ORACOLO: Perplexity come fornitore di verità oggettiva
  // Perplexity ignora TUTTO il contesto - mantieni solo la query pura dall'ultimo messaggio utente
  let contextualMessage = newMessage;
  
  // Per l'Oracolo: estrai SOLO l'ultima domanda dell'utente dalla cronologia
  if (conversationHistory.length > 0) {
    // Trova l'ultimo messaggio dell'utente (non AI)
    const lastUserMessage = [...conversationHistory].reverse().find(msg => msg.senderId === "user");
    if (lastUserMessage) {
      contextualMessage = lastUserMessage.content;
      console.log(`🔮 Oracolo query pura estratta: "${contextualMessage}"`);
    }
  }
  
  messages.push({
    role: "user",
    content: contextualMessage
  });

  try {
    const response = await perplexity.chat.completions.create({
      model: provider.defaultModel || "llama-3.1-sonar-small-128k-online",
      messages,
      temperature: getPersonalityTemperature(personality.nameId),
      max_tokens: 1000,
      return_related_questions: false,
      return_images: false,
      search_recency_filter: "month"
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("Risposta vuota dall'API Perplexity");
    }

    const aiResponse = response.choices[0].message.content;
    console.log(`✅ Risposta Perplexity generata per ${personality.displayName}: ${aiResponse.substring(0, 100)}...`);
    
    return aiResponse;
  } catch (error) {
    console.error(`❌ Errore chiamata Perplexity per ${personality.displayName}:`, error);
    throw new Error(`Errore generazione risposta Perplexity: ${error.message}`);
  }
}