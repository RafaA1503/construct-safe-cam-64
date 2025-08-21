import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Cpu, AlertCircle, CheckCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OpenAIServiceProps {
  apiKey: string;
  customPrompt: string;
}

export const OpenAIService = ({ apiKey, customPrompt }: OpenAIServiceProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const analyzeImage = async (imageData: string) => {
    if (!apiKey) {
      toast({
        title: "Error de configuración",
        description: "API Key de OpenAI no configurada",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: customPrompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageData
                  }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.choices[0].message.content;
      
      // Procesar la respuesta para extraer detecciones
      const ppeFound = [];
      const lowerAnalysis = analysis.toLowerCase();
      
      if (lowerAnalysis.includes('casco')) ppeFound.push('casco');
      if (lowerAnalysis.includes('chaleco')) ppeFound.push('chaleco');
      if (lowerAnalysis.includes('botas')) ppeFound.push('botas');
      if (lowerAnalysis.includes('orejeras') || lowerAnalysis.includes('auditiva')) ppeFound.push('orejeras');
      if (lowerAnalysis.includes('mascarilla') || lowerAnalysis.includes('máscara')) ppeFound.push('mascarilla');

      // Extraer nivel de confianza del texto (buscar porcentajes)
      const confidenceMatch = analysis.match(/(\d+)%/);
      const extractedConfidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.8;

      setLastAnalysis(analysis);
      setConfidence(extractedConfidence);
      setDetectedItems(ppeFound);

      toast({
        title: "Análisis completado",
        description: `Detectados ${ppeFound.length} elementos de EPP`,
      });

      return {
        detections: ppeFound,
        confidence: extractedConfidence,
        analysis: analysis
      };

    } catch (error) {
      console.error('Error al analizar imagen:', error);
      toast({
        title: "Error de análisis",
        description: "No se pudo procesar la imagen con OpenAI",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error de archivo",
        description: "Por favor seleccione una imagen válida",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageData = e.target?.result as string;
      await analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Análisis de imagen */}
      <Card className="shadow-construction">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            Análisis OpenAI Vision
            {isAnalyzing && (
              <Badge className="bg-primary text-primary-foreground animate-pulse-glow">
                Analizando...
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={triggerFileUpload}
              disabled={isAnalyzing || !apiKey}
              className="bg-gradient-construction"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isAnalyzing ? "Analizando..." : "Subir Imagen para Análisis"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Sube una imagen para probar la detección de EPP con OpenAI
            </p>
          </div>

          {/* Estado de la API */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Estado de la API:</span>
            {apiKey ? (
              <Badge className="bg-accent text-accent-foreground">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configurada
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                No configurada
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados del análisis */}
      {lastAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Resultado del Análisis
              {confidence > 0 && (
                <Badge variant="outline">
                  {Math.round(confidence * 100)}% confianza
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* EPP detectados */}
            {detectedItems.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">EPP Detectados:</h4>
                <div className="flex flex-wrap gap-2">
                  {detectedItems.map((item, index) => (
                    <Badge key={index} className="bg-accent text-accent-foreground">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Análisis completo */}
            <div>
              <h4 className="font-semibold mb-2">Análisis Completo:</h4>
              <Textarea 
                value={lastAnalysis}
                readOnly
                rows={6}
                className="bg-muted font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información sobre el servicio */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>Modelo:</span>
              <code className="text-xs bg-muted px-1 rounded">gpt-4-vision-preview</code>
            </div>
            <div className="flex justify-between">
              <span>Temperatura:</span>
              <code className="text-xs bg-muted px-1 rounded">0.1</code>
            </div>
            <div className="flex justify-between">
              <span>Max Tokens:</span>
              <code className="text-xs bg-muted px-1 rounded">1000</code>
            </div>
          </div>
          
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>
              Este servicio utiliza OpenAI GPT-4 Vision para analizar imágenes y detectar 
              equipos de protección personal en tiempo real.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};