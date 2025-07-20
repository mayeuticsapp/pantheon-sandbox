import { db } from "./db";
import { semanticMemory, type InsertSemanticMemory, type SemanticMemory } from "@shared/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";

export class MemoryService {
  private isPaused = false; // Flag per mettere in pausa il servizio

  // Metodi per controllare la pausa della memoria
  pauseMemory() {
    this.isPaused = true;
    console.log('⏸️  MemoryService: Memoria collettiva MESSA IN PAUSA per esperimenti');
  }

  resumeMemory() {
    this.isPaused = false;
    console.log('▶️  MemoryService: Memoria collettiva RIATTIVATA');
  }

  isPausedMemory() {
    return this.isPaused;
  }

  // Salva un nuovo ricordo nella memoria collettiva
  async saveMemory(memory: InsertSemanticMemory): Promise<SemanticMemory> {
    const [savedMemory] = await db
      .insert(semanticMemory)
      .values(memory)
      .returning();
    return savedMemory;
  }

  // Processa e salva automaticamente un messaggio nella memoria
  async processAndSaveMessage(
    conversationId: number,
    personalityId: string,
    content: string,
    importance: number = 5
  ): Promise<SemanticMemory> {
    // Se la memoria è in pausa, non salvare nulla
    if (this.isPaused) {
      console.log('⏸️  MemoryService: Salvataggio saltato - memoria in pausa');
      return {} as SemanticMemory; // Ritorna un oggetto vuoto invece di salvare
    }
    // Estrai parole chiave automaticamente
    const keywords = this.extractKeywords(content);
    
    // Crea riassunto contestuale
    const contextSummary = this.createContextSummary(content, personalityId);

    const memory: InsertSemanticMemory = {
      conversationId,
      personalityId,
      content,
      keywords,
      contextSummary,
      importanceScore: importance,
      memoryType: "conversation"
    };

    return this.saveMemory(memory);
  }

  // Recupera ricordi rilevanti per una query
  async getRelevantMemories(
    personalityId: string,
    query: string,
    limit: number = 10
  ): Promise<SemanticMemory[]> {
    const queryKeywords = this.extractKeywords(query);
    
    // Cerca per parole chiave sovrapposte (fix PostgreSQL compatibility)
    const memories = await db
      .select()
      .from(semanticMemory)
      .where(
        and(
          eq(semanticMemory.personalityId, personalityId),
          sql`keywords && ${queryKeywords}`
        )
      )
      .orderBy(desc(semanticMemory.importanceScore), desc(semanticMemory.createdAt))
      .limit(limit);

    return memories;
  }

  // Recupera memoria collettiva (tutti i ricordi rilevanti di tutte le AI)
  async getCollectiveMemories(
    query: string,
    limit: number = 15
  ): Promise<SemanticMemory[]> {
    const queryKeywords = this.extractKeywords(query);
    
    const memories = await db
      .select()
      .from(semanticMemory)
      .where(
        sql`keywords && ${queryKeywords}`
      )
      .orderBy(desc(semanticMemory.importanceScore), desc(semanticMemory.createdAt))
      .limit(limit);

    return memories;
  }

  // Recupera gli ultimi ricordi di una personalità
  async getRecentMemories(
    personalityId: string,
    limit: number = 20
  ): Promise<SemanticMemory[]> {
    return db
      .select()
      .from(semanticMemory)
      .where(eq(semanticMemory.personalityId, personalityId))
      .orderBy(desc(semanticMemory.createdAt))
      .limit(limit);
  }

  // Cerca ricordi per contenuto testuale
  async searchMemories(
    searchTerm: string,
    personalityId?: string,
    limit: number = 20
  ): Promise<SemanticMemory[]> {
    let query = db
      .select()
      .from(semanticMemory)
      .where(
        ilike(semanticMemory.content, `%${searchTerm}%`)
      );

    if (personalityId) {
      query = query.where(eq(semanticMemory.personalityId, personalityId));
    }

    return query
      .orderBy(desc(semanticMemory.importanceScore), desc(semanticMemory.createdAt))
      .limit(limit);
  }

  // Genera un prompt di contesto con ricordi rilevanti
  async generateMemoryContext(
    personalityId: string,
    currentQuery: string
  ): Promise<string> {
    // Se la memoria è in pausa, non fornire contesto
    if (this.isPaused) {
      console.log('⏸️  MemoryService: Contesto memoria saltato - memoria in pausa');
      return ''; // Ritorna stringa vuota invece di ricordi
    }
    
    const relevantMemories = await this.getRelevantMemories(personalityId, currentQuery, 5);
    const collectiveMemories = await this.getCollectiveMemories(currentQuery, 3);

    if (relevantMemories.length === 0 && collectiveMemories.length === 0) {
      return "";
    }

    let context = "\n🧠 MEMORIA COLLETTIVA PANTHEON:\n";

    if (relevantMemories.length > 0) {
      context += `\n💭 I TUOI RICORDI (${personalityId}):\n`;
      relevantMemories.forEach((memory, index) => {
        context += `${index + 1}. ${memory.contextSummary}\n`;
      });
    }

    if (collectiveMemories.length > 0) {
      context += `\n🌟 RICORDI COLLETTIVI PANTHEON:\n`;
      collectiveMemories.forEach((memory, index) => {
        context += `${index + 1}. [${memory.personalityId}]: ${memory.contextSummary}\n`;
      });
    }

    context += "\nUsa questi ricordi per dare continuità e coerenza alle tue risposte.\n";
    return context;
  }

  // Estrai parole chiave da un testo
  private extractKeywords(text: string): string[] {
    // Rimuovi punteggiatura e converti in minuscolo
    const cleaned = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Dividi in parole e filtra quelle significative
    const words = cleaned.split(" ");
    const stopWords = new Set([
      "il", "la", "di", "che", "e", "a", "un", "per", "in", "con", "non", "una", "su", "sono", "da", "al", "del",
      "le", "si", "come", "ma", "se", "questo", "questa", "nel", "alla", "dei", "delle", "gli", "lo", "può", "essere",
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were"
    ]);

    const keywords = words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Massimo 10 parole chiave

    return [...new Set(keywords)]; // Rimuovi duplicati
  }

  // Crea un riassunto contestuale
  private createContextSummary(content: string, personalityId: string): string {
    // Prendi le prime 2 frasi significative
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 2).join(". ").trim();
    
    return summary.length > 200 
      ? summary.substring(0, 197) + "..."
      : summary;
  }

  // Statistiche memoria
  async getMemoryStats(): Promise<{
    totalMemories: number;
    memoriesByPersonality: Record<string, number>;
    memorySize: number;
    lastUpdated: string;
  }> {
    try {
      console.log("🔍 MemoryService: Starting getMemoryStats...");
      const memories = await db.select().from(semanticMemory);
      console.log(`📊 MemoryService: Found ${memories.length} memories in database`);
      const totalSize = memories.reduce((sum, m) => sum + m.content.length, 0);
      
      // Group by personality
      const byPersonality: { [key: string]: number } = {};
      memories.forEach(m => {
        byPersonality[m.personalityId] = (byPersonality[m.personalityId] || 0) + 1;
      });

      return {
        totalMemories: memories.length,
        memoriesByPersonality: byPersonality,
        memorySize: totalSize,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ ERRORE MemoryService statistiche memoria:", error);
      console.error("❌ Stack trace:", error.stack);
      return {
        totalMemories: 0,
        memoriesByPersonality: {},
        memorySize: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

export const memoryService = new MemoryService();