import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Attachment } from "@shared/schema";

interface FileUploadProps {
  conversationId: number;
  onFileUploaded?: (attachment: Attachment) => void;
  attachments?: Attachment[];
  onDeleteAttachment?: (id: number) => void;
}

export default function FileUpload({ 
  conversationId, 
  onFileUploaded, 
  attachments = [],
  onDeleteAttachment 
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log("File selezionato:", file);
    
    if (!file) {
      console.log("Nessun file selezionato");
      return;
    }

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File troppo grande",
        description: "Il file deve essere inferiore a 10MB",
        variant: "destructive",
      });
      return;
    }

    console.log(`Caricamento file: ${file.name}, dimensione: ${file.size}, tipo: ${file.type}`);
    setIsUploading(true);

    try {
      // Read file content
      const content = await readFileContent(file);
      console.log("Contenuto file letto, lunghezza:", content.length);
      
      const attachmentData = {
        filename: generateUniqueFilename(file.name),
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        content: content,
        uploadedBy: "user"
      };

      console.log("Invio dati attachment:", attachmentData);

      const attachment = await apiRequest(
        `/api/conversations/${conversationId}/attachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attachmentData),
        }
      );

      console.log("Attachment creato:", attachment);

      toast({
        title: "File caricato",
        description: `${file.name} è stato caricato con successo`,
      });

      onFileUploaded?.(attachment);
      
      // Reset input
      event.target.value = "";
    } catch (error) {
      console.error("Errore caricamento file:", error);
      toast({
        title: "Errore caricamento",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
          // For text files, store as plain text
          resolve(reader.result as string);
        } else {
          // For binary files, store as base64
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      
      if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const generateUniqueFilename = (originalName: string): string => {
    const timestamp = Date.now();
    const extension = originalName.split(".").pop();
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    return `${baseName}_${timestamp}.${extension}`;
  };

  const handleDeleteAttachment = async (id: number) => {
    try {
      await apiRequest(`/api/attachments/${id}`, {
        method: "DELETE",
      });

      toast({
        title: "File eliminato",
        description: "Il file è stato rimosso dalla conversazione",
      });

      onDeleteAttachment?.(id);
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Errore eliminazione",
        description: "Si è verificato un errore durante l'eliminazione del file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("text/")) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("json")) return "📋";
    return "📎";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File per il Pantheon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".txt,.md,.json,.pdf,.png,.jpg,.jpeg,.csv"
              className="w-full p-2 border border-gray-300 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
          {isUploading && (
            <Badge variant="secondary" className="animate-pulse">
              Caricamento...
            </Badge>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">File caricati:</h4>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getFileIcon(attachment.mimeType)}</span>
                  <div>
                    <p className="text-sm font-medium">{attachment.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)} • {new Date(attachment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>📋 Supportati: testo (.txt, .md), JSON, PDF, immagini (.png, .jpg), CSV</p>
          <p>📏 Dimensione massima: 10MB</p>
          <p>💡 Clicca su "Scegli file" per selezionare un documento da condividere nel Pantheon</p>
        </div>
      </CardContent>
    </Card>
  );
}