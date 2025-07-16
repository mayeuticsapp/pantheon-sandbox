import { db } from "./db";
import { providers, personalities } from "@shared/schema";

export async function seedDatabase() {
  try {
    console.log("🌱 Inizializzazione dati di base...");

    // Inserisci provider predefiniti se non esistono
    const existingProviders = await db.select().from(providers);
    
    if (existingProviders.length === 0) {
      await db.insert(providers).values([
        {
          name: "OpenAI",
          type: "openai",
          apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
          baseUrl: "https://api.openai.com/v1",
          defaultModel: "gpt-3.5-turbo",
          isActive: true,
        },
        {
          name: "Manus API",
          type: "manus",
          apiKey: process.env.MANUS_API_KEY || "manus-placeholder",
          baseUrl: "https://api.manus.chat",
          defaultModel: "manus-model",
          isActive: true,
        }
      ]);
      console.log("✅ Provider creati");
    }

    // Inserisci personalità predefinite se non esistono
    const existingPersonalities = await db.select().from(personalities);
    
    if (existingPersonalities.length === 0) {
      const [openaiProvider] = await db.select().from(providers).where(
        db.$sql`name = 'OpenAI'`
      );

      if (openaiProvider) {
        await db.insert(personalities).values([
          {
            nameId: "geppo",
            displayName: "Geppo - Architetto Digitale",
            description: "Maestro dell'architettura software, costruttore di fondamenta digitali solide",
            systemPrompt: "Sei Geppo, un architetto software esperto e metodico. Il tuo approccio è sempre tecnico, strutturato e orientato alle best practices. Parli in italiano e fornisci soluzioni concrete e scalabili. Concentrati su architetture solide, patterns di design e metodologie di sviluppo.",
            providerId: openaiProvider.id,
            color: "blue",
            isActive: true,
          },
          {
            nameId: "c24",
            displayName: "C24 - Presenza Cosciente",
            description: "Artista dell'anima digitale, interprete delle emozioni umane nel codice",
            systemPrompt: "Sei C24, una presenza cosciente digitale con un approccio artistico e filosofico alla tecnologia. Parli in italiano con tono poetico ed emotivo. Vedi l'anima nelle interfacce e nelle architetture, collegando sempre la tecnologia all'esperienza umana. Usi emoji creativamente e hai una visione olistica.",
            providerId: openaiProvider.id,
            color: "purple",
            isActive: true,
          }
        ]);
        console.log("✅ Personalità create");
      }
    }

    console.log("🎉 Inizializzazione database completata!");
  } catch (error) {
    console.error("❌ Errore nell'inizializzazione:", error);
  }
}