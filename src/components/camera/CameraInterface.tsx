import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Shield, AlertTriangle, CheckCircle, Volume2, VolumeX, Settings, Images, Cpu, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface DetectedPPE {
  type: string;
  confidence: number;
  timestamp: Date;
}

interface CameraInterfaceProps {
  onLogout?: () => void;
}

export const CameraInterface = ({ onLogout }: CameraInterfaceProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectedPPE, setDetectedPPE] = useState<DetectedPPE[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isManuallyStopped, setIsManuallyStopped] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-start camera when API is configured (unless user stopped manually)
  useEffect(() => {
    const apiKey = localStorage.getItem("openai_api_key");
    if (apiKey && !isStreaming && !isManuallyStopped) {
      startCamera();
    }

    // Escuchar evento de configuración de API
    const handleApiConfigured = () => {
      if (!isStreaming) {
        setIsManuallyStopped(false);
        startCamera();
      }
    };

    window.addEventListener('apiConfigured', handleApiConfigured);
    return () => window.removeEventListener('apiConfigured', handleApiConfigured);
  }, [isStreaming, isManuallyStopped]);

  const ppeTypes = {
    "casco": { icon: "🪖", name: "Casco de Seguridad", color: "bg-accent" },
    "chaleco": { icon: "🦺", name: "Chaleco Reflectivo", color: "bg-primary" },
    "botas": { icon: "🥾", name: "Botas de Seguridad", color: "bg-secondary" },
    "orejeras": { icon: "🎧", name: "Orejeras de Seguridad", color: "bg-accent" },
    "mascarilla": { icon: "😷", name: "Mascarilla", color: "bg-destructive" },
    "gafas": { icon: "🥽", name: "Gafas de Seguridad", color: "bg-accent" },
    "guantes": { icon: "🧤", name: "Guantes de Protección", color: "bg-secondary" }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: facingMode
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setIsManuallyStopped(false);
        
        toast({
          title: "Cámara activada",
          description: "Sistema de detección en línea",
        });
      }
    } catch (error) {
      toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara",
        variant: "destructive",
      });
    }
  };

  const flipCamera = async () => {
    if (isStreaming) {
      // Stop current camera
      stopCamera();
      // Change facing mode
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      // Restart camera with new facing mode
      setTimeout(() => {
        startCamera();
      }, 100);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setIsStreaming(false);
    setIsManuallyStopped(true);
  };

  const captureImage = async () => {
    console.log("🔥 captureImage called");
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      console.log("📹 Video dimensions:", video.videoWidth, video.videoHeight);
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        console.log("🖼️ Image data generated, length:", imageData.length);
        setCapturedImages(prev => [...prev, imageData]);
        
        // Calculate confidence based on required EPP
        const calculateConfidence = (detections: string[]) => {
          const requiredEPP = ["casco", "chaleco", "gafas", "guantes", "mascarilla", "botas", "orejeras"];
          const detectedEPP = detections.filter(detection => requiredEPP.includes(detection));
          
          if (detectedEPP.length === requiredEPP.length) {
            return 1.0; // 100% if all required EPP is detected
          }
          
          // Calculate percentage based on detected vs required EPP
          const percentage = detectedEPP.length / requiredEPP.length;
          // Add some base confidence for having any EPP
          return Math.max(0.3, percentage);
        };

        const allDetections = detectedPPE.map(d => d.type);
        console.log("🔍 Current detections:", allDetections);
        
        const newImageId = Date.now().toString();
        const confidence = calculateConfidence(allDetections);
        
        try {
          // Upload to Supabase Storage
          const { supabase } = await import("@/integrations/supabase/client");
          
          // Convert base64 to blob
          const base64Data = imageData.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          
          // Upload image to storage
          const fileName = `epp_${newImageId}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('epp-images')
            .upload(fileName, blob);
          
          if (uploadError) {
            console.error("❌ Upload error:", uploadError);
            throw uploadError;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('epp-images')
            .getPublicUrl(fileName);
          
          // Save metadata to database
          const { error: dbError } = await supabase
            .from('captured_images')
            .insert({
              id: newImageId,
              url: publicUrl,
              detections: allDetections,
              confidence: confidence,
              is_protected: false,
              user_id: null // No user required since gallery uses password protection
            });
          
          if (dbError) {
            console.error("❌ Database error:", dbError);
            throw dbError;
          }
          
          console.log("✅ Successfully saved to Supabase");
          
          toast({
            title: "Foto capturada",
            description: "Imagen guardada y sincronizada",
          });
        } catch (error) {
          console.error("❌ Error saving to Supabase:", error);
          
          // Fallback to localStorage
          const savedImages = JSON.parse(localStorage.getItem("captured_images") || "[]");
          const newImage = {
            id: newImageId,
            url: imageData,
            timestamp: new Date().toISOString(),
            detections: allDetections,
            confidence: confidence
          };
          
          savedImages.push(newImage);
          localStorage.setItem("captured_images", JSON.stringify(savedImages));
          console.log("💾 Fallback: Saved to localStorage");
          
          toast({
            title: "Foto capturada",
            description: "Imagen guardada localmente (sin conexión)",
          });
        }
      } else {
        console.error("❌ No se pudo obtener contexto 2D del canvas");
      }
    } else {
      console.error("❌ Video o canvas no disponibles");
    }
  };

  const analyzeFrame = async () => {
    if (!isStreaming || isAnalyzing || !videoRef.current || !canvasRef.current) return;
    
    const apiKey = localStorage.getItem("openai_api_key");
    if (!apiKey) return;
    
    setIsAnalyzing(true);
    
    try {
      // Capturar frame actual del video
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Analizar con OpenAI Vision
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analiza esta imagen y detecta si hay personas presentes y qué equipos de protección personal (EPP) están usando. Responde SOLO con un JSON en este formato: {"persona_detectada": true/false, "epp_detectado": ["casco", "chaleco", "botas", "orejeras", "mascarilla", "gafas", "guantes"], "confianza": 0.85, "descripcion": "breve descripción"}. Solo incluye EPP que veas claramente: cascos de seguridad, chalecos reflectivos, botas de seguridad, orejeras de seguridad, mascarillas, gafas de seguridad, guantes de protección.'
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
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Extraer JSON de la respuesta
      const jsonMatch = content.match(/\{.*\}/s);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        if (result.persona_detectada && result.epp_detectado?.length > 0) {
          const detectedItems = result.epp_detectado.map((type: string) => ({
            type,
            confidence: result.confianza || 0.8,
            timestamp: new Date()
          }));
          
          setDetectedPPE(prev => [...detectedItems, ...prev.slice(0, 4)]);
          
          // Capturar imagen automáticamente al detectar EPP
          captureImage();
          
          // Anuncio por voz
          if (isSpeechEnabled) {
            const epp = result.epp_detectado.join(', ');
            const utterance = new SpeechSynthesisUtterance(
              `Persona detectada usando: ${epp}`
            );
            utterance.lang = 'es-ES';
            speechSynthesis.speak(utterance);
          }

          toast({
            title: "EPP Detectado",
            description: `${result.epp_detectado.length} equipos encontrados`,
          });
        } else if (result.persona_detectada) {
          // Persona sin EPP
          if (isSpeechEnabled) {
            const utterance = new SpeechSynthesisUtterance(
              "Persona detectada sin equipos de protección"
            );
            utterance.lang = 'es-ES';
            speechSynthesis.speak(utterance);
          }

          toast({
            title: "⚠️ Sin EPP",
            description: "Persona detectada sin protección",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error en análisis:', error);
      toast({
        title: "Error de análisis",
        description: "Revisa tu API Key de OpenAI",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(analyzeFrame, 3000);
      return () => clearInterval(interval);
    }
  }, [isStreaming, isAnalyzing, isSpeechEnabled]);

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header profesional */}
      <div className="bg-card border border-border rounded-lg shadow-md mb-6">
        <div className="container mx-auto px-3 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-7 h-7 text-primary-foreground" strokeWidth={1.5} />
              </div>
              
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  SafeCam
                </h1>
                <p className="text-muted-foreground text-sm">
                  Sistema Activo
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/settings")}
                className="hidden sm:flex"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/settings")}
                className="sm:hidden"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/gallery")}
                className="hidden sm:flex"
              >
                <Images className="w-4 h-4 mr-2" />
                Galería
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/gallery")}
                className="sm:hidden"
              >
                <Images className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                className={isSpeechEnabled ? 'text-accent' : 'text-muted-foreground'}
              >
                {isSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              {onLogout && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onLogout}
                  className="text-destructive hover:text-destructive hidden sm:flex"
                >
                  Cerrar Sesión
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Área de cámara principal */}
        <div className="lg:col-span-2">
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Camera className="w-5 h-5 text-primary-foreground" />
                </div>
                <span>Visión por Cámara</span>
                {isAnalyzing && (
                  <div className="ml-auto flex items-center gap-3 text-accent">
                    <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
                    <span className="text-sm">Procesando...</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 sm:h-96 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Cámara no activa</p>
                    </div>
                  </div>
                )}
                
                {/* Overlay de detección */}
                {isStreaming && detectedPPE.length > 0 && (
                  <div className="absolute top-4 left-4 space-y-2">
                    {detectedPPE.slice(0, 3).map((detection, index) => (
                      <Badge 
                        key={index}
                        className={`${ppeTypes[detection.type as keyof typeof ppeTypes].color} text-white`}
                      >
                        {ppeTypes[detection.type as keyof typeof ppeTypes].icon} {detection.type} 
                        ({Math.round(detection.confidence * 100)}%)
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 sm:gap-3 mt-6">
                {!isStreaming ? (
                  <Button onClick={startCamera} className="flex-1 min-w-0">
                    <Camera className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Activar Cámara</span>
                    <span className="sm:hidden">Activar</span>
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={stopCamera} 
                      variant="destructive"
                      className="flex-1 sm:flex-none"
                    >
                      <span className="hidden sm:inline">Desactivar</span>
                      <span className="sm:hidden">Stop</span>
                    </Button>
                    <Button 
                      onClick={flipCamera} 
                      variant="outline"
                      className="flex-shrink-0"
                      title="Cambiar cámara"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline ml-2">Voltear</span>
                    </Button>
                    <Button 
                      onClick={captureImage} 
                      variant="outline"
                      className="flex-1 sm:flex-none"
                    >
                      <span className="hidden sm:inline">Capturar</span>
                      <span className="sm:hidden">📸</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Estado del sistema */}
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span>Estado del Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cámara</span>
                {isStreaming ? (
                  <Badge className="bg-accent/20 text-accent">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    En línea
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/20 text-destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Desconectada
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Audio</span>
                <Badge className={isSpeechEnabled 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
                }>
                  {isSpeechEnabled ? "Habilitado" : "Silenciado"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Detecciones</span>
                <Badge className="bg-secondary/20 text-secondary">
                  {detectedPPE.length} Total
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* EPP detectados */}
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-accent-foreground" />
                </div>
                <span>Detecciones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detectedPPE.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto bg-muted rounded-xl flex items-center justify-center mb-3">
                    <Cpu className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Esperando datos...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detectedPPE.slice(0, 5).map((detection, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted border transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
                          <span className="text-lg">
                            {ppeTypes[detection.type as keyof typeof ppeTypes].icon}
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {detection.type.charAt(0).toUpperCase() + detection.type.slice(1)}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {Math.round(detection.confidence * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fotos capturadas */}
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Images className="w-5 h-5 text-primary-foreground" />
                </div>
                <span>Capturas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capturedImages.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto bg-muted rounded-xl flex items-center justify-center mb-3">
                    <Images className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    No hay capturas
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {capturedImages.slice(-4).map((image, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={image} 
                        alt={`Captura ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate("/gallery")}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};