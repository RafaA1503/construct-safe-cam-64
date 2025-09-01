import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  Construction,
  Loader2
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
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
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

    // Read custom prompt from localStorage, fallback to default
    const savedPrompt = localStorage.getItem('detection_prompt');
    const customPrompt = savedPrompt || `Analiza esta imagen y detecta los siguientes equipos de protección personal (EPP):
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
          model: 'gpt-4o-mini',
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
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
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
        description: error instanceof Error ? error.message : "No se pudo procesar la imagen con OpenAI",
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
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate all files are images
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast({
        title: "Error de archivo",
        description: "Por favor seleccione solo imágenes válidas",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setTotalImages(files.length);
    setProcessedCount(0);
    setProcessingProgress(0);

    // Create previews for all images
    const previews = await Promise.all(
      files.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      }))
    );
    setPreviewImages(previews);

    const results = [];
    let allDetections: string[] = [];
    let allMissing: string[] = [];

    try {
      // Process each image sequentially to avoid rate limits
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        toast({
          title: `Procesando imagen ${i + 1} de ${files.length}`,
          description: `Analizando: ${file.name}`,
        });

        // Upload image to storage
        const imageUrl = await uploadImageToStorage(file);
        if (!imageUrl) {
          console.error(`Failed to upload image: ${file.name}`);
          continue;
        }

        // Convert to base64 for OpenAI
        const imageDataUrl = await new Promise<string>((resolve) => {
          const fileReader = new FileReader();
          fileReader.onload = (e) => resolve(e.target?.result as string);
          fileReader.readAsDataURL(file);
        });

        // Analyze with OpenAI
        const result = await analyzeImageWithOpenAI(imageDataUrl);
        
        if (result) {
          // Save to database
          await saveToDatabase(
            imageUrl,
            result.detections,
            result.missing,
            result.confidence,
            result.analysis
          );

          results.push(result);
          allDetections = [...new Set([...allDetections, ...result.detections])];
          allMissing = [...new Set([...allMissing, ...result.missing])];
        }

        setProcessedCount(i + 1);
        setProcessingProgress(((i + 1) / files.length) * 100);

        // Add small delay to avoid rate limits
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update UI with combined results from last processed batch
      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        setLastAnalysis(lastResult.analysis);
        setConfidence(lastResult.confidence);
        setDetectedItems(allDetections);
        setMissingItems(allMissing.filter(item => !allDetections.includes(item)));

        toast({
          title: "Análisis completado",
          description: `${results.length} imágenes procesadas. Detectados ${allDetections.length} tipos de EPP únicos`,
        });
      }

    } catch (error) {
      console.error('Error processing images:', error);
      toast({
        title: "Error de procesamiento",
        description: "Error al procesar las imágenes",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setProcessingProgress(0);
      setProcessedCount(0);
      setTotalImages(0);
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
    <div className="min-h-screen bg-gradient-bg p-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header mejorado */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow animate-pulse-glow">
              <Construction className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Análisis Inteligente EPP
              </h1>
              <p className="text-muted-foreground text-lg">
                Detección automatizada con inteligencia artificial • Incluye botas de seguridad
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} className="shadow-md hover:shadow-lg transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        {/* Upload section mejorado */}
        <Card className="shadow-lg border-0 bg-card/80 backdrop-blur-sm animate-scale-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-xl font-semibold">Subir Imágenes para Análisis</span>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Análisis automático de EPP: cascos, chalecos, botas, orejeras y mascarillas
                </p>
              </div>
              {isAnalyzing && (
                <Badge className="bg-gradient-primary text-primary-foreground animate-pulse-glow shadow-glow">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Procesando {processedCount}/{totalImages}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <div className="relative">
                <Button 
                  onClick={triggerFileUpload}
                  disabled={isAnalyzing}
                  className="bg-gradient-primary shadow-glow hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 mr-2" />
                  )}
                  {isAnalyzing ? `Procesando ${processedCount}/${totalImages}...` : "Seleccionar Imágenes"}
                </Button>
                
                {!isAnalyzing && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-success rounded-full flex items-center justify-center animate-bounce-in">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Análisis inteligente de EPP:</strong> Cascos, chalecos, botas de seguridad, orejeras y mascarillas
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos: JPG, PNG, WEBP • Análisis individual o en lote • Powered by OpenAI
                </p>
              </div>

              {/* Progress bar mejorado */}
              {isAnalyzing && totalImages > 0 && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Analizando imágenes...
                    </span>
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                      {Math.round(processingProgress)}%
                    </span>
                  </div>
                  <Progress value={processingProgress} className="w-full h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Imagen {processedCount} de {totalImages} completada
                  </p>
                </div>
              )}
            </div>

            {/* Preview de las imágenes */}
            {previewImages.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium">
                  Vista previa ({previewImages.length} imagen{previewImages.length !== 1 ? 'es' : ''}):
                </Label>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {previewImages.map((preview, index) => (
                    <div key={index} className="border-2 border-dashed border-muted rounded-lg p-2 bg-muted/50">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resultados del análisis mejorados */}
        {lastAnalysis && (
          <div className="grid gap-6 lg:grid-cols-2 animate-scale-in">
            {/* EPP Detectados */}
            <Card className="shadow-success border-0 bg-gradient-to-br from-card via-card/90 to-accent/5 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-success rounded-lg flex items-center justify-center shadow-success">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-semibold text-accent">EPP Detectados</span>
                    <p className="text-sm text-muted-foreground font-normal">Equipos encontrados en la imagen</p>
                  </div>
                  <Badge className="bg-gradient-success text-white shadow-success animate-bounce-in">
                    {detectedItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {detectedItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {detectedItems.map((item, index) => (
                      <Badge 
                        key={index} 
                        className="bg-accent/15 text-accent border-accent/30 hover:bg-accent/25 transition-all duration-200 hover:scale-105 shadow-sm"
                      >
                        <HardHat className="w-3 h-3 mr-1" />
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No se detectaron EPP en esta imagen</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* EPP Faltantes */}
            <Card className="shadow-danger border-0 bg-gradient-to-br from-card via-card/90 to-destructive/5 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-danger rounded-lg flex items-center justify-center shadow-danger">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-semibold text-destructive">EPP Faltantes</span>
                    <p className="text-sm text-muted-foreground font-normal">Equipos requeridos no detectados</p>
                  </div>
                  <Badge className={missingItems.length > 0 ? "bg-gradient-danger text-white shadow-danger animate-bounce-in" : "bg-gradient-success text-white shadow-success animate-bounce-in"}>
                    {missingItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missingItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {missingItems.map((item, index) => (
                      <Badge 
                        key={index} 
                        className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25 transition-all duration-200 hover:scale-105 shadow-sm"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-accent mx-auto mb-2" />
                    <p className="text-accent font-semibold">
                      ¡Excelente! Todos los EPP están presentes
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      La imagen cumple con los estándares de seguridad
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Análisis completo mejorado */}
        {lastAnalysis && (
          <Card className="shadow-glow border-0 bg-gradient-to-br from-card via-card/95 to-primary/5 backdrop-blur-sm animate-scale-in">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
                    <ImageIcon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <span className="text-xl font-semibold">Análisis Detallado con IA</span>
                    <p className="text-sm text-muted-foreground font-normal">Reporte completo generado por OpenAI</p>
                  </div>
                </div>
                {confidence > 0 && (
                  <Badge className="bg-gradient-primary text-primary-foreground border-0 shadow-glow animate-pulse-glow">
                    <CheckCircle className="w-3 h-3 mr-1" />
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