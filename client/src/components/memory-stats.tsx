import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Database, Search, Clock } from "lucide-react";

interface MemoryStats {
  totalMemories: number;
  memoriesByPersonality: { [key: string]: number };
  memorySize: number;
  lastUpdated: string;
}

export default function MemoryStats() {
  const { data: stats, isLoading } = useQuery<MemoryStats>({
    queryKey: ["/api/memory/stats"],
    queryFn: async () => {
      const response = await fetch("/api/memory/stats");
      if (!response.ok) throw new Error("Failed to fetch memory stats");
      return response.json();
    },
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Memoria Collettiva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Caricamento statistiche...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Memoria Collettiva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Nessuna statistica disponibile</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="h-5 w-5 mr-2 text-purple-600" />
          🧠 Memoria Collettiva Pantheon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistiche generali */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center">
              <Database className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm font-medium text-purple-800">Ricordi Totali</span>
            </div>
            <div className="text-lg font-bold text-purple-900 mt-1">
              {stats.totalMemories.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <Search className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Dimensione DB</span>
            </div>
            <div className="text-lg font-bold text-blue-900 mt-1">
              {(stats.memorySize / 1024 / 1024).toFixed(1)} MB
            </div>
          </div>
        </div>

        {/* Ricordi per personalità */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            Ricordi per Personalità
          </h4>
          <div className="space-y-2">
            {Object.entries(stats.memoriesByPersonality || {}).map(([personalityId, count]) => {
              const personalityNames: { [key: string]: string } = {
                terra: "🌍 Terra - Stabilità",
                cielo: "☁️ Cielo - Elevazione", 
                mare: "🌊 Mare - Profondità",
                ricercatore: "🔍 Ricercatore - Conoscenza"
              };
              
              const name = personalityNames[personalityId] || personalityId;
              const percentage = stats.totalMemories > 0 ? (count / stats.totalMemories * 100) : 0;
              
              return (
                <div key={personalityId} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{name}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ultimo aggiornamento */}
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            📅 Ultimo aggiornamento: {new Date(stats.lastUpdated).toLocaleString('it-IT')}
          </div>
          <div className="text-xs text-green-600 mt-1">
            ✅ Sistema memoria collettiva attivo - Le AI ricordano tutto
          </div>
        </div>
      </CardContent>
    </Card>
  );
}