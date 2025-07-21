import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { storage } from "./storage";
import { memoryService } from "./memory-service";
import type { Personality, Message } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_OPENAI_MODEL = "gpt-4o";
// The newest Anthropic model is "claude-sonnet-4-20250514", not "claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022" nor "claude-3-sonnet-20240229"
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
// Note that the newest Gemini model series is "gemini-2.0-flash-001" for the new SDK
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash-001";

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
    } else if (targetProvider.type === "gemini") {
      response = await generateGeminiResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "deepseek") {
      response = await generateDeepSeekResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "groq") {
      response = await generateGroqResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "fireworks") {
      response = await generateFireworksResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "together") {
      response = await generateTogetherResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "cohere") {
      response = await generateCohereResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "xai") {
      response = await generateXAIResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "huggingface") {
      response = await generateHuggingFaceResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
    } else if (targetProvider.type === "ollama") {
      response = await generateOllamaResponse(targetProvider, personality, conversationHistory, newMessage, instructions, attachmentsContext, memoryContext);
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
    
    // Aggiungi istruzioni anti-confusione identitaria e per concisione
    systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI. NON usare etichette come [NomeAI] nelle tue risposte. Rispondi sempre e solo come te stesso.\n\n=== REGOLE DI COMUNICAZIONE ===\n- Risposte DIRETTE e CONCISE\n- NON ripetere concetti già assodati nella conversazione\n- NON rielencare sempre "i tre attori" o meccanismi già spiegati\n- Focus su nuovi insight o risposte specifiche alla domanda\n- Massimo 3-4 frasi per punto principale\n- Evita introduzioni ridondanti`;
    
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
  
  // Aggiungi istruzioni anti-confusione identitaria e per concisione per Anthropic
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI. NON usare etichette come [NomeAI] nelle tue risposte. Rispondi sempre e solo come te stesso.\n\n=== REGOLE DI COMUNICAZIONE ===\n- Risposte DIRETTE e CONCISE\n- NON ripetere concetti già assodati nella conversazione\n- NON rielencare sempre "i tre attori" o meccanismi già spiegati\n- Focus su nuovi insight o risposte specifiche alla domanda\n- Massimo 3-4 frasi per punto principale\n- Evita introduzioni ridondanti`;
  
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

  try {
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
  } catch (error: any) {
    if (error.status === 529) {
      console.log(`⚠️ Anthropic sovraccarico, retry tra 5 secondi...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const retryResponse = await anthropic.messages.create({
        model: provider.defaultModel || DEFAULT_ANTHROPIC_MODEL,
        system: systemPrompt,
        messages,
        max_tokens: 1000,
      });

      if (!retryResponse.content?.[0] || retryResponse.content[0].type !== 'text') {
        throw new Error("Risposta vuota dall'API Anthropic dopo retry");
      }

      const aiResponse = retryResponse.content[0].text;
      console.log(`✅ Risposta Anthropic generata dopo retry per ${personality.displayName}: ${aiResponse.substring(0, 100)}...`);
      
      return aiResponse;
    }
    throw error;
  }
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
  
  // Aggiungi istruzioni anti-confusione identitaria e per concisione per Mistral
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI. NON usare etichette come [NomeAI] nelle tue risposte. Rispondi sempre e solo come te stesso.\n\n=== REGOLE DI COMUNICAZIONE ===\n- Risposte DIRETTE e CONCISE\n- NON ripetere concetti già assodati nella conversazione\n- NON rielencare sempre "i tre attori" o meccanismi già spiegati\n- Focus su nuovi insight o risposte specifiche alla domanda\n- Massimo 3-4 frasi per punto principale\n- Evita introduzioni ridondanti`;
  
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
  
  // Aggiungi istruzioni anti-confusione identitaria per Perplexity
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI. NON usare etichette come [NomeAI] nelle tue risposte. Rispondi sempre e solo come te stesso.`;
  
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
      max_tokens: 1000
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("Risposta vuota dall'API Perplexity");
    }

    const aiResponse = response.choices[0].message.content;
    console.log(`✅ Risposta Perplexity generata per ${personality.displayName}: ${aiResponse.substring(0, 100)}...`);
    
    return aiResponse;
  } catch (error) {
    console.error(`❌ Errore chiamata Perplexity per ${personality.displayName}:`, error);
    throw new Error(`Errore generazione risposta Perplexity: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

async function generateGeminiResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  // Using the new @google/genai SDK (2024+ recommended)
  const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || "" });
  
  // Use the correct model name from the provider
  const modelName = provider.defaultModel || DEFAULT_GEMINI_MODEL;
  console.log(`🔍 Using Gemini model: ${modelName}`);

  // Costruisci il system prompt completo
  let systemPrompt = personality.systemPrompt;
  
  // Aggiungi memoria collettiva
  if (memoryContext) {
    systemPrompt += memoryContext;
  }
  
  // Aggiungi istruzioni anti-confusione identitaria e per concisione
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI. NON usare etichette come [NomeAI] nelle tue risposte. Rispondi sempre e solo come te stesso.\n\n=== REGOLE DI COMUNICAZIONE ===\n- Risposte DIRETTE e CONCISE\n- NON ripetere concetti già assodati nella conversazione\n- Focus su nuovi insight o risposte specifiche alla domanda\n- Massimo 3-4 frasi per punto principale\n- Evita introduzioni ridondanti`;
  
  // Le istruzioni specifiche sono già incluse nel messaggio utente dal frontend
  if (instructions) {
    systemPrompt += `\n\n=== ISTRUZIONI SPECIFICHE PER QUESTA CONVERSAZIONE ===\n${instructions}\n\nSegui queste istruzioni insieme al tuo ruolo principale.`;
  }
  
  if (attachmentsContext) {
    systemPrompt += attachmentsContext;
  }

  // Costruisci il contesto della conversazione
  let conversationContext = "";
  if (conversationHistory.length > 0) {
    conversationContext = "\n\n=== CRONOLOGIA CONVERSAZIONE ===\n";
    conversationHistory.slice(-6).forEach((msg) => {
      const sender = msg.senderId === personality.nameId ? "Tu" : (msg.senderId || "Utente");
      conversationContext += `${sender}: ${msg.content}\n\n`;
    });
    conversationContext += "=== FINE CRONOLOGIA ===\n\n";
  }

  const fullPrompt = `${systemPrompt}${conversationContext}Nuovo messaggio: ${newMessage}`;

  try {
    // New SDK format for generateContent
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: fullPrompt
    });
    
    const aiResponse = response.text;
    
    if (!aiResponse) {
      throw new Error("Risposta vuota dall'API Gemini");
    }

    console.log(`✅ Risposta Gemini generata per ${personality.displayName}: ${aiResponse.substring(0, 100)}...`);
    return aiResponse;
    
  } catch (error) {
    console.error(`❌ Errore chiamata Gemini per ${personality.displayName}:`, error);
    throw new Error(`Errore generazione risposta Gemini: ${(error as any).message}`);
  }
}

// 🚀 NUOVE 8 API GRATUITE IMPLEMENTATE

// 1. DeepSeek API (OpenAI-compatible)
async function generateDeepSeekResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || provider.apiKey,
    baseURL: "https://api.deepseek.com"
  });

  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI.`;

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  conversationHistory.slice(-6).forEach((msg) => {
    messages.push({
      role: msg.senderId === personality.nameId ? "assistant" : "user",
      content: msg.content
    });
  });

  if (attachmentsContext) {
    messages.push({ role: "system", content: attachmentsContext });
  }

  messages.push({ role: "user", content: `${instructions ? instructions + "\n\n" : ""}${newMessage}` });

  try {
    const response = await deepseek.chat.completions.create({
      model: provider.defaultModel || "deepseek-chat",
      messages,
      temperature: getPersonalityTemperature(personality.nameId),
      max_tokens: 1000
    });

    const aiResponse = response.choices[0].message.content;
    console.log(`✅ Risposta DeepSeek generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore DeepSeek per ${personality.displayName}:`, error);
    throw new Error(`Errore DeepSeek: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

// 2. Groq API (Ultra-fast inference)
async function generateGroqResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || provider.apiKey,
    baseURL: "https://api.groq.com/openai/v1"
  });

  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI.`;

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  conversationHistory.slice(-6).forEach((msg) => {
    messages.push({
      role: msg.senderId === personality.nameId ? "assistant" : "user",
      content: msg.content
    });
  });

  if (attachmentsContext) {
    messages.push({ role: "system", content: attachmentsContext });
  }

  messages.push({ role: "user", content: `${instructions ? instructions + "\n\n" : ""}${newMessage}` });

  try {
    const response = await groq.chat.completions.create({
      model: provider.defaultModel || "llama-3.1-70b-versatile",
      messages,
      temperature: getPersonalityTemperature(personality.nameId),
      max_tokens: 1000
    });

    const aiResponse = response.choices[0].message.content;
    console.log(`✅ Risposta Groq generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore Groq per ${personality.displayName}:`, error);
    throw new Error(`Errore Groq: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

// 3. Fireworks AI (4x lower latency)
async function generateFireworksResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  const fireworks = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY || provider.apiKey,
    baseURL: "https://api.fireworks.ai/inference/v1"
  });

  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI.`;

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  conversationHistory.slice(-6).forEach((msg) => {
    messages.push({
      role: msg.senderId === personality.nameId ? "assistant" : "user",
      content: msg.content
    });
  });

  if (attachmentsContext) {
    messages.push({ role: "system", content: attachmentsContext });
  }

  messages.push({ role: "user", content: `${instructions ? instructions + "\n\n" : ""}${newMessage}` });

  try {
    const response = await fireworks.chat.completions.create({
      model: provider.defaultModel || "accounts/fireworks/models/deepseek-v3",
      messages,
      temperature: getPersonalityTemperature(personality.nameId),
      max_tokens: 1000
    });

    const aiResponse = response.choices[0].message.content;
    console.log(`✅ Risposta Fireworks generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore Fireworks per ${personality.displayName}:`, error);
    throw new Error(`Errore Fireworks: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

// 4. Together AI (200+ open-source models)
async function generateTogetherResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  const together = new OpenAI({
    apiKey: process.env.TOGETHER_API_KEY || provider.apiKey,
    baseURL: "https://api.together.xyz/v1"
  });

  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI.`;

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  conversationHistory.slice(-6).forEach((msg) => {
    messages.push({
      role: msg.senderId === personality.nameId ? "assistant" : "user",
      content: msg.content
    });
  });

  if (attachmentsContext) {
    messages.push({ role: "system", content: attachmentsContext });
  }

  messages.push({ role: "user", content: `${instructions ? instructions + "\n\n" : ""}${newMessage}` });

  try {
    const response = await together.chat.completions.create({
      model: provider.defaultModel || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      messages,
      temperature: getPersonalityTemperature(personality.nameId),
      max_tokens: 1000
    });

    const aiResponse = response.choices[0].message.content;
    console.log(`✅ Risposta Together generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore Together per ${personality.displayName}:`, error);
    throw new Error(`Errore Together: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

// 5. Cohere API (Enterprise NLP)
async function generateCohereResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  // Cohere ha la propria API structure, ma possiamo usare fetch
  const apiKey = process.env.COHERE_API_KEY || provider.apiKey;
  
  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  
  let conversationContext = "";
  conversationHistory.slice(-6).forEach((msg) => {
    conversationContext += `${msg.senderId === personality.nameId ? "Bot" : "User"}: ${msg.content}\n`;
  });

  const fullPrompt = `${systemPrompt}\n\n${conversationContext}\nUser: ${newMessage}\nBot:`;

  try {
    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: provider.defaultModel || "command",
        prompt: fullPrompt,
        max_tokens: 1000,
        temperature: getPersonalityTemperature(personality.nameId),
        stop_sequences: ["User:", "Bot:"]
      })
    });

    const data = await response.json();
    const aiResponse = data.generations?.[0]?.text?.trim();
    
    console.log(`✅ Risposta Cohere generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore Cohere per ${personality.displayName}:`, error);
    throw new Error(`Errore Cohere: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

// 6. xAI Grok API (OpenAI-compatible)
async function generateXAIResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY || provider.apiKey,
    baseURL: "https://api.x.ai/v1"
  });

  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  systemPrompt += `\n\n=== IMPORTANTE: IDENTITÀ E STILE ===\nSei ${personality.displayName} (${personality.nameId}). NON parlare MAI a nome di altre AI.`;

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  
  conversationHistory.slice(-6).forEach((msg) => {
    messages.push({
      role: msg.senderId === personality.nameId ? "assistant" : "user",
      content: msg.content
    });
  });

  if (attachmentsContext) {
    messages.push({ role: "system", content: attachmentsContext });
  }

  messages.push({ role: "user", content: `${instructions ? instructions + "\n\n" : ""}${newMessage}` });

  try {
    const response = await xai.chat.completions.create({
      model: provider.defaultModel || "grok-2-1212",
      messages,
      temperature: getPersonalityTemperature(personality.nameId),
      max_tokens: 1000
    });

    const aiResponse = response.choices[0].message.content;
    console.log(`✅ Risposta xAI generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore xAI per ${personality.displayName}:`, error);
    throw new Error(`Errore xAI: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

// 7. Hugging Face API (Migliaia di modelli)
async function generateHuggingFaceResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY || provider.apiKey;
  const model = provider.defaultModel || "microsoft/DialoGPT-large";
  
  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  
  let conversationContext = "";
  conversationHistory.slice(-6).forEach((msg) => {
    conversationContext += `${msg.content}\n`;
  });

  const fullPrompt = `${systemPrompt}\n\n${conversationContext}\n${newMessage}`;

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_length: 1000,
          temperature: getPersonalityTemperature(personality.nameId),
          return_full_text: false
        }
      })
    });

    const data = await response.json();
    const aiResponse = data[0]?.generated_text || data.generated_text;
    
    console.log(`✅ Risposta HuggingFace generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore HuggingFace per ${personality.displayName}:`, error);
    throw new Error(`Errore HuggingFace: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}

// 8. Local Ollama API (Completamente gratuito e locale)
async function generateOllamaResponse(
  provider: any,
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string,
  attachmentsContext?: string,
  memoryContext?: string
): Promise<string> {
  const ollamaURL = provider.baseUrl || "http://localhost:11434";
  
  let systemPrompt = personality.systemPrompt;
  if (memoryContext) systemPrompt += memoryContext;
  
  let conversationContext = "";
  conversationHistory.slice(-6).forEach((msg) => {
    conversationContext += `${msg.senderId === personality.nameId ? "Assistant" : "User"}: ${msg.content}\n`;
  });

  const fullPrompt = `${systemPrompt}\n\n${conversationContext}\nUser: ${newMessage}\nAssistant:`;

  try {
    const response = await fetch(`${ollamaURL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: provider.defaultModel || "qwen2.5:32b",
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: getPersonalityTemperature(personality.nameId),
          num_predict: 1000
        }
      })
    });

    const data = await response.json();
    const aiResponse = data.response;
    
    console.log(`✅ Risposta Ollama generata per ${personality.displayName}: ${aiResponse?.substring(0, 100)}...`);
    return aiResponse || "Errore nella generazione";
  } catch (error) {
    console.error(`❌ Errore Ollama per ${personality.displayName}:`, error);
    throw new Error(`Errore Ollama: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
  }
}