import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  Lock, 
  Shield, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  ImageIcon,
  ArrowLeft,
  HardHat,
  Construction
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ImageAnalysis = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(0);
  const [detectedItems, setDetectedItems] = useState<string[]>([]);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const CORRECT_PASSWORD = "CarlayDavid2025";
  const REQUIRED_PPE = ["casco", "chaleco", "botas", "orejeras", "mascarilla"];

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      toast({
        title: "Acceso autorizado",
        description: "Bienvenido al sistema de análisis de imágenes",
      });
    } else {
      toast({
        title: "Acceso denegado",
        description: "Contraseña incorrecta",
        variant: "destructive",
      });
    }
  };

  const analyzeImageWithOpenAI = async (imageData: string) => {
    const openaiApiKey = localStorage.getItem('openai_api_key');
    
    if (!openaiApiKey) {
      toast({
        title: "Error de configuración",
        description: "API Key de OpenAI no configurada. Ve a Configuración para agregarla.",
        variant: "destructive",
      });
      return null;
    }

    const customPrompt = `Analiza esta imagen y detecta los siguientes equipos de protección personal (EPP):
- Casco de seguridad
- Chaleco reflectivo o de alta visibilidad
- Botas de seguridad
- Orejeras o protección auditiva
- Mascarilla o protección respiratoria

Para cada EPP, indica si está presente o ausente. Proporciona una lista clara de los EPP detectados y los que faltan. También indica el nivel de confianza en porcentaje.

Responde en español con el siguiente formato:
EPP DETECTADOS:
- [lista de EPP encontrados]

EPP FALTANTES:
- [lista de EPP que no se detectaron]

NIVEL DE CONFIANZA: X%

OBSERVACIONES ADICIONALES:
[cualquier observación relevante sobre la seguridad]`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
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

      // Determinar elementos faltantes
      const missing = REQUIRED_PPE.filter(item => !ppeFound.includes(item));

      // Extraer nivel de confianza del texto
      const confidenceMatch = analysis.match(/(\d+)%/);
      const extractedConfidence = confidenceMatch ? parseInt(confidenceMatch[1]) / 100 : 0.8;

      return {
        detections: ppeFound,
        missing: missing,
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
    }
  };

  const saveToDatabase = async (imageUrl: string, detections: string[], missing: string[], confidence: number, analysis: string) => {
    try {
      const { error } = await supabase
        .from('captured_images')
        .insert({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          url: imageUrl,
          detections: detections,
          confidence: confidence,
          created_at: new Date().toISOString(),
          user_id: null, // Anonymous upload
          is_protected: false
        });

      if (error) {
        console.error('Error saving to database:', error);
        toast({
          title: "Error de base de datos",
          description: "No se pudo guardar el análisis en la base de datos",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  };

  const uploadImageToStorage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('epp-images')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrl } = supabase.storage
        .from('epp-images')
        .getPublicUrl(fileName);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error de carga",
        description: "No se pudo subir la imagen al almacenamiento",
        variant: "destructive",
      });
      return null;
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

    setIsAnalyzing(true);

    try {
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Subir imagen al almacenamiento
      const imageUrl = await uploadImageToStorage(file);
      if (!imageUrl) {
        setIsAnalyzing(false);
        return;
      }

      // Analizar imagen con OpenAI
      const imageDataUrl = await new Promise<string>((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = (e) => resolve(e.target?.result as string);
        fileReader.readAsDataURL(file);
      });

      const result = await analyzeImageWithOpenAI(imageDataUrl);
      
      if (result) {
        setLastAnalysis(result.analysis);
        setConfidence(result.confidence);
        setDetectedItems(result.detections);
        setMissingItems(result.missing);

        // Guardar en la base de datos
        const saved = await saveToDatabase(
          imageUrl,
          result.detections,
          result.missing,
          result.confidence,
          result.analysis
        );

        if (saved) {
          toast({
            title: "Análisis completado",
            description: `Imagen procesada y guardada. Detectados ${result.detections.length} EPP, faltan ${result.missing.length}`,
          });
        }
      }

    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Error de procesamiento",
        description: "No se pudo procesar la imagen completa",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center shadow-md">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Área Restringida
              </CardTitle>
              <p className="text-muted-foreground mt-2">
                Análisis de Imágenes EPP
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña de acceso</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese la contraseña"
                  className="focus:ring-primary"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary shadow-md"
              >
                <Shield className="w-4 h-4 mr-2" />
                Acceder
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-md">
              <Construction className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Análisis de Imágenes EPP
              </h1>
              <p className="text-muted-foreground">
                Detección automatizada de equipos de protección personal
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        {/* Upload section */}
        <Card className="shadow-lg border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Subir Imagen para Análisis
              {isAnalyzing && (
                <Badge className="bg-primary text-primary-foreground animate-pulse-glow">
                  Procesando...
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
                disabled={isAnalyzing}
                className="bg-gradient-primary shadow-md"
                size="lg"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isAnalyzing ? "Procesando..." : "Seleccionar Imagen"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Formatos soportados: JPG, PNG, WEBP (máx. 10MB)
              </p>
            </div>

            {/* Preview de la imagen */}
            {previewImage && (
              <div className="mt-4">
                <Label className="text-sm font-medium">Vista previa:</Label>
                <div className="mt-2 border-2 border-dashed border-muted rounded-lg p-4 bg-muted/50">
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados del análisis */}
        {lastAnalysis && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* EPP Detectados */}
            <Card className="shadow-lg border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent">
                  <CheckCircle className="w-5 h-5" />
                  EPP Detectados
                  <Badge variant="secondary">{detectedItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detectedItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detectedItems.map((item, index) => (
                      <Badge key={index} className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                        <HardHat className="w-3 h-3 mr-1" />
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No se detectaron EPP</p>
                )}
              </CardContent>
            </Card>

            {/* EPP Faltantes */}
            <Card className="shadow-lg border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  EPP Faltantes
                  <Badge variant="destructive">{missingItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missingItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {missingItems.map((item, index) => (
                      <Badge key={index} variant="destructive">
                        <Eye className="w-3 h-3 mr-1" />
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-accent font-medium">
                    ¡Todos los EPP están presentes!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Análisis completo */}
        {lastAnalysis && (
          <Card className="shadow-lg border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  Análisis Detallado
                </span>
                {confidence > 0 && (
                  <Badge variant="outline" className="border-primary text-primary">
                    {Math.round(confidence * 100)}% confianza
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={lastAnalysis}
                readOnly
                rows={8}
                className="bg-muted/50 font-mono text-sm resize-none"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ImageAnalysis;