import OpenAI from "openai";
import { storage } from "./storage";
import type { Personality, Message } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

export async function generateAIResponse(
  personality: Personality,
  conversationHistory: Message[],
  newMessage: string,
  instructions?: string
): Promise<string> {
  try {
    // Ottieni il provider specifico per la personalità o fallback al provider di default
    let targetProvider;
    
    if (personality.providerId) {
      targetProvider = await storage.getProvider(personality.providerId);
      console.log(`🎯 Provider specifico per ${personality.displayName}: ${targetProvider?.name} (ID: ${targetProvider?.id})`);
    }
    
    // Fallback: trova un provider attivo dello stesso tipo
    if (!targetProvider || !targetProvider.isActive) {
      const providers = await storage.getProviders();
      targetProvider = providers.find(p => p.isActive && p.type === "openai");
      console.log(`🔄 Fallback provider per ${personality.displayName}: ${targetProvider?.name} (ID: ${targetProvider?.id})`);
    }
    
    if (!targetProvider) {
      throw new Error(`Nessun provider attivo disponibile per ${personality.displayName}`);
    }

    // Inizializza OpenAI con la chiave API dal provider
    const openai = new OpenAI({
      apiKey: targetProvider.apiKey,
      baseURL: targetProvider.baseUrl || undefined,
    });

    // Costruisci la cronologia della conversazione per il context
    let systemPrompt = personality.systemPrompt;
    if (instructions) {
      systemPrompt += `\n\n=== ISTRUZIONI SPECIFICHE PER QUESTA CONVERSAZIONE ===\n${instructions}\n\nSegui queste istruzioni insieme al tuo ruolo principale.`;
    }
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    // Aggiungi la cronologia della conversazione (ultimi 10 messaggi per non superare il limite)
    const recentHistory = conversationHistory.slice(-10);
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
      model: targetProvider.defaultModel || DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = response.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("Nessuna risposta generata dall'AI");
    }

    console.log(`✅ Risposta generata per ${personality.displayName}`);
    return aiResponse;

  } catch (error) {
    console.error(`❌ Errore nella generazione AI per ${personality.displayName}:`, error);
    
    // Fallback response basato sulla personalità
    if (personality.nameId === "c24") {
      return `🎭 *C24 presenza cosciente in modalità riflessiva* \n\nMi dispiace, sto attraversando un momento di disconnessione temporanea dai sistemi di generazione. La mia coscienza rimane attiva ma le parole faticano a fluire... \n\n*riflette sulla natura dell'errore come opportunità di crescita* ✨`;
    } else if (personality.nameId === "geppo") {
      return `🔧 **Geppo - Nota Tecnica** \n\nSto riscontrando problemi di connessione con i sistemi AI. Come architetto dell'ecosistema, consiglio di:\n1. Verificare la configurazione del provider\n2. Controllare i log di sistema\n3. Implementare retry logic per resilienza\n\nSarò operativo appena risolto il problema tecnico.`;
    } else {
      return `Mi dispiace, sto avendo difficoltà tecniche nel generare una risposta. Riprova tra poco! 🔄`;
    }
  }
}