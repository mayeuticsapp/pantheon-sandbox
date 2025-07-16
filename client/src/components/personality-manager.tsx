import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, TestTube, Activity, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { personalitiesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Personality, Provider, InsertPersonality } from "@shared/schema";

interface PersonalityManagerProps {
  personalities: Personality[];
  providers: Provider[];
}

const colorOptions = [
  { value: "blue", label: "Blu", class: "bg-geppo" },
  { value: "purple", label: "Viola", class: "bg-c24" },
  { value: "orange", label: "Arancione", class: "bg-orange-500" },
  { value: "red", label: "Rosso", class: "bg-red-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
];

export default function PersonalityManager({ personalities, providers }: PersonalityManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<InsertPersonality>>({
    nameId: "",
    displayName: "",
    description: "",
    systemPrompt: "",
    providerId: undefined,
    color: "blue",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: personalitiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personalities"] });
      resetForm();
      toast({
        title: "Personalità creata",
        description: "Nuova personalità AI creata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare la personalità",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertPersonality> }) =>
      personalitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personalities"] });
      resetForm();
      toast({
        title: "Personalità aggiornata",
        description: "Personalità aggiornata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la personalità",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: personalitiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personalities"] });
      toast({
        title: "Personalità eliminata",
        description: "Personalità rimossa con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la personalità",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      nameId: "",
      displayName: "",
      description: "",
      systemPrompt: "",
      providerId: undefined,
      color: "blue",
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.nameId || !formData.displayName || !formData.systemPrompt || !formData.providerId) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, data: formData as InsertPersonality });
    } else {
      createMutation.mutate(formData as InsertPersonality);
    }
  };

  const handleEdit = (personality: Personality) => {
    setFormData({
      nameId: personality.nameId,
      displayName: personality.displayName,
      description: personality.description || "",
      systemPrompt: personality.systemPrompt,
      providerId: personality.providerId || undefined,
      color: personality.color || "blue",
    });
    setIsEditing(true);
    setEditingId(personality.id);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questa personalità?")) {
      deleteMutation.mutate(id);
    }
  };

  const getPersonalityColor = (color: string) => {
    const colorOption = colorOptions.find(c => c.value === color);
    return colorOption?.class || "bg-gray-500";
  };

  const getProviderName = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    return provider ? `${provider.name} (${provider.defaultModel})` : "Provider sconosciuto";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lista Personalità */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Personalità AI Attive</CardTitle>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                }}
                className="bg-geppo hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuova Personalità
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {personalities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">Nessuna personalità configurata</p>
                <p className="text-xs mt-1">Crea la prima personalità AI per iniziare</p>
              </div>
            ) : (
              personalities.map((personality) => (
                <div key={personality.id} className="personality-card border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                  <div className="flex items-start space-x-4">
                    <div className={`w-16 h-16 ${getPersonalityColor(personality.color!)} rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                      {personality.nameId.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-dark-primary">{personality.displayName}</h3>
                        <span className="w-3 h-3 bg-connection rounded-full"></span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{personality.description}</p>
                      <div className="flex items-center mt-3 space-x-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          personality.nameId === "geppo" ? "bg-geppo/10 text-geppo" : "bg-c24/10 text-c24"
                        }`}>
                          {getProviderName(personality.providerId!)}
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">ID: {personality.nameId}</span>
                      </div>
                      <div className="flex items-center mt-3 space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(personality)}
                          className="text-xs p-1 h-auto"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Modifica
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs p-1 h-auto"
                        >
                          <TestTube className="h-3 w-3 mr-1" />
                          Test Chat
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(personality.id)}
                          className="text-xs p-1 h-auto text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Statistiche Rapide */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-geppo/10 rounded-lg flex items-center justify-center">
                  <MessageSquare className="text-geppo text-lg" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-dark-primary">{personalities.length}</p>
                  <p className="text-sm text-gray-500">Personalità Attive</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-connection/10 rounded-lg flex items-center justify-center">
                  <Activity className="text-connection text-lg" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-dark-primary">{providers.length}</p>
                  <p className="text-sm text-gray-500">Provider Disponibili</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Creazione/Modifica Personalità */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? "Modifica Personalità AI" : "Crea Nuova Personalità AI"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome Identificativo *</label>
              <Input
                value={formData.nameId}
                onChange={(e) => setFormData({ ...formData, nameId: e.target.value })}
                placeholder="es. manus"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome Visualizzato *</label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="es. Manus - Sviluppatore Senior"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione Breve</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="es. Esperto di sviluppo full-stack e DevOps"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider AI *</label>
              <Select 
                value={formData.providerId?.toString()} 
                onValueChange={(value) => setFormData({ ...formData, providerId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona Provider..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id.toString()}>
                      {provider.name} ({provider.defaultModel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Colore Tema</label>
              <div className="flex space-x-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={`w-8 h-8 ${color.class} rounded-lg border-2 transition-colors ${
                      formData.color === color.value ? "border-gray-400" : "border-transparent"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Sistema *</label>
              <Textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Definisci la personalità, il ruolo e il comportamento dell'AI..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Questo prompt definirà come l'AI si comporta e risponde nelle conversazioni
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-geppo hover:bg-blue-700"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  isEditing ? "Aggiornamento..." : "Creazione..."
                ) : (
                  <>
                    {isEditing ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isEditing ? "Aggiorna Personalità" : "Crea Personalità"}
                  </>
                )}
              </Button>
              {isEditing && (
                <Button 
                  variant="outline"
                  onClick={resetForm}
                  className="px-4"
                >
                  Annulla
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
