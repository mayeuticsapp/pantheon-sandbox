import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { storage } from "./storage";
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

    // Ottieni gli allegati della conversazione se disponibili
    let attachmentsContext = "";
    if (conversationId) {
      try {
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
        console.log("⚠️ Impossibile caricare allegati:", error);
      }
    }

    // Gestisci diversi tipi di provider
    if (targetProvider.type === "anthropic") {
      return await generateAnthropicResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext);
    } else if (targetProvider.type === "openai") {
      return await generateOpenAIResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext);
    } else if (targetProvider.type === "mistral") {
      return await generateMistralResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext);
    } else if (targetProvider.type === "perplexity") {
      return await generatePerplexityResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext);
    } else {
      throw new Error(`Tipo di provider non supportato: ${targetProvider.type}`);
    }
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
  attachmentsContext?: string
): Promise<string> {
  // Inizializza OpenAI con la chiave API dal provider
  const openai = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl || undefined,
  });

    // Costruisci la cronologia della conversazione per il context
    let systemPrompt = personality.systemPrompt;
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
  attachmentsContext?: string
): Promise<string> {
  // Inizializza Anthropic con la chiave API dal provider
  const anthropic = new Anthropic({
    apiKey: provider.apiKey,
  });

  // Costruisci la cronologia della conversazione per il context
  let systemPrompt = personality.systemPrompt;
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
  attachmentsContext?: string
): Promise<string> {
  // Mistral usa un'API compatibile con OpenAI
  const mistral = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl || "https://api.mistral.ai/v1",
  });

  // Costruisci la cronologia della conversazione per il context
  let systemPrompt = personality.systemPrompt;
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
  attachmentsContext?: string
): Promise<string> {
  console.log(`🔍 Generando risposta Perplexity per ${personality.displayName}...`);
  
  const openai = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseUrl,
  });

  // Costruisci il prompt di sistema
  let systemPrompt = personality.systemPrompt;
  if (instructions) {
    systemPrompt += `\n\n=== ISTRUZIONI SPECIFICHE ===\n${instructions}`;
  }
  if (attachmentsContext) {
    systemPrompt += attachmentsContext;
  }

  // Costruisci i messaggi della conversazione - Perplexity richiede alternanza user/assistant
  const messages: any[] = [
    {
      role: "system",
      content: systemPrompt
    }
  ];

  // Per Perplexity, uso SOLO il messaggio corrente (nessuna cronologia per evitare errori alternanza)
  messages.push({
    role: "user",
    content: newMessage
  });

  try {
    const response = await openai.chat.completions.create({
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