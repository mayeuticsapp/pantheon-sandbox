import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, TestTube, Brain, Plug, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { providersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Provider, InsertProvider } from "@shared/schema";

interface ProviderManagerProps {
  providers: Provider[];
}

export default function ProviderManager({ providers }: ProviderManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResults, setTestResults] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<Partial<InsertProvider>>({
    name: "",
    type: "",
    apiKey: "",
    baseUrl: "",
    defaultModel: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: providersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      resetForm();
      toast({
        title: "Provider creato",
        description: "Nuovo provider AI creato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile creare il provider",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProvider> }) =>
      providersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      resetForm();
      toast({
        title: "Provider aggiornato",
        description: "Provider aggiornato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il provider",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: providersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/providers"] });
      toast({
        title: "Provider eliminato",
        description: "Provider rimosso con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il provider",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: providersApi.test,
    onSuccess: (data) => {
      setTestResults(data);
      toast({
        title: "Test completato",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error) => {
      setTestResults({ success: false, message: error.message });
      toast({
        title: "Test fallito",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      type: "",
      apiKey: "",
      baseUrl: "",
      defaultModel: "",
    });
    setIsEditing(false);
    setEditingId(null);
    setTestResults(null);
    setShowApiKey(false);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.type || !formData.apiKey || !formData.defaultModel) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, data: formData as InsertProvider });
    } else {
      createMutation.mutate(formData as InsertProvider);
    }
  };

  const handleEdit = (provider: Provider) => {
    setFormData({
      name: provider.name,
      type: provider.type,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl || "",
      defaultModel: provider.defaultModel || "",
    });
    setIsEditing(true);
    setEditingId(provider.id);
    setTestResults(null);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questo provider?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleTest = () => {
    if (!formData.type || !formData.apiKey || !formData.baseUrl || !formData.defaultModel) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi per testare la connessione",
        variant: "destructive",
      });
      return;
    }

    testMutation.mutate({
      type: formData.type,
      apiKey: formData.apiKey,
      baseUrl: formData.baseUrl,
      defaultModel: formData.defaultModel,
    });
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case "openai": return <Brain className="text-green-500 text-lg" />;
      case "manus": return <Plug className="text-orange-500 text-lg" />;
      default: return <Plug className="text-gray-500 text-lg" />;
    }
  };

  const getStatusBadge = (provider: Provider) => {
    return (
      <span className="w-3 h-3 bg-connection rounded-full"></span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lista Provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Provider AI Configurati</CardTitle>
            <Button 
              onClick={() => {
                resetForm();
                setIsEditing(false);
              }}
              className="bg-geppo hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Plug className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Nessun provider configurato</p>
              <p className="text-xs mt-1">Aggiungi il primo provider AI per iniziare</p>
            </div>
          ) : (
            providers.map((provider) => (
              <div key={provider.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getProviderIcon(provider.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-dark-primary">{provider.name}</h3>
                      <p className="text-sm text-gray-600">
                        {provider.type === "openai" ? "Provider ufficiale GPT" : 
                         provider.type === "manus" ? "Provider personalizzato Manus" : 
                         "Provider personalizzato"}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(provider)}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Stato</p>
                    <p className="font-medium text-connection">Attivo</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Modello</p>
                    <p className="font-medium text-dark-primary">{provider.defaultModel}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Endpoint</p>
                    <p className="font-medium text-dark-primary text-xs truncate">
                      {provider.baseUrl || "Default"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Tipo</p>
                    <p className="font-medium text-dark-primary capitalize">{provider.type}</p>
                  </div>
                </div>

                <div className="flex items-center mt-4 space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(provider)}
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
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(provider.id)}
                    className="text-xs p-1 h-auto text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Rimuovi
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Form Aggiunta/Modifica Provider */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? "Modifica Provider" : "Configura Nuovo Provider"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome Provider *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="es. Custom API Provider"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Provider *</label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI Compatible</SelectItem>
                  <SelectItem value="manus">Manus API</SelectItem>
                  <SelectItem value="custom">Custom Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key *</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 h-auto"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Base URL *</label>
              <Input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://api.provider.com/v1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modello Predefinito *</label>
              <Input
                value={formData.defaultModel}
                onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                placeholder="es. gpt-3.5-turbo"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                onClick={handleTest}
                disabled={testMutation.isPending}
                variant="outline"
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testMutation.isPending ? "Testing..." : "Test Connessione"}
              </Button>
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
                    {isEditing ? "Aggiorna Provider" : "Salva Provider"}
                  </>
                )}
              </Button>
            </div>

            {isEditing && (
              <Button 
                variant="outline"
                onClick={resetForm}
                className="w-full"
              >
                Annulla Modifica
              </Button>
            )}
          </div>

          {/* Test Results */}
          {testResults && (
            <div className={`mt-6 p-4 rounded-lg ${
              testResults.success ? "bg-green-50" : "bg-red-50"
            }`}>
              <h4 className="text-sm font-medium text-dark-primary mb-2">Risultato Test:</h4>
              <div className="text-sm">
                <div className={`flex items-center space-x-2 ${
                  testResults.success ? "text-green-600" : "text-red-600"
                }`}>
                  {testResults.success ? (
                    <TestTube className="h-4 w-4" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>{testResults.success ? "Connessione riuscita" : "Connessione fallita"}</span>
                </div>
                <p className="text-gray-600 mt-1">{testResults.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
