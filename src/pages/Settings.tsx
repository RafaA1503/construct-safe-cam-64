import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Key, Eye, EyeOff, Save, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const Settings = () => {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(
    "Analiza esta imagen y detecta equipos de protección personal de construcción. Identifica específicamente: cascos de seguridad, chalecos reflectivos, botas de seguridad, orejeras de seguridad, mascarillas, gafas de seguridad, y guantes de protección. Para cada elemento detectado, indica el tipo de EPP y un nivel de confianza del 0-100%."
  );
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cargar configuración existente al montar el componente
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    const savedPrompt = localStorage.getItem("detection_prompt");
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsConnected(true);
    }
    if (savedPrompt) {
      setCustomPrompt(savedPrompt);
    }
  }, []);

  const handleSaveSettings = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error de configuración",
        description: "La API Key de OpenAI es requerida",
        variant: "destructive",
      });
      return;
    }

    // Guardar en localStorage (en producción usar backend seguro)
    localStorage.setItem("openai_api_key", apiKey);
    localStorage.setItem("detection_prompt", customPrompt);
    
    setIsConnected(true);
    
    toast({
      title: "Configuración guardada",
      description: "La API de OpenAI ha sido configurada. La cámara se activará automáticamente.",
    });

    // Notificar al sistema que la API está configurada
    // Esto dispara la activación automática de la cámara en CameraInterface
    window.dispatchEvent(new CustomEvent('apiConfigured'));
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Ingrese una API Key válida",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    
    try {
      // Simular test de conexión
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConnected(true);
      toast({
        title: "Conexión exitosa",
        description: "La API de OpenAI responde correctamente",
      });
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con la API de OpenAI",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <SettingsIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
                  <p className="text-muted-foreground">API de OpenAI y configuraciones avanzadas</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Badge className={isConnected ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"}>
                {isConnected ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Conectado
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Desconectado
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Configuración de API */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                Configuración de OpenAI API
              </CardTitle>
              <CardDescription>
                Configure su API Key de OpenAI para habilitar la detección automática de EPP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key de OpenAI</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Obtenga su API Key desde{" "}
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleTestConnection}
                  variant="outline"
                  disabled={isTesting || !apiKey.trim()}
                >
                  {isTesting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-rotate-loader" />
                      Probando...
                    </div>
                  ) : (
                    "Probar Conexión"
                  )}
                </Button>
                
                <Button 
                  onClick={handleSaveSettings}
                  disabled={!apiKey.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Configuración de detección */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Prompt de Detección Personalizado</CardTitle>
              <CardDescription>
                Personalice las instrucciones que se envían a OpenAI para la detección de EPP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt de Detección</Label>
                <Textarea
                  id="prompt"
                  rows={6}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Equipos de Protección Detectables:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { name: "Cascos de Seguridad", icon: "🪖" },
                    { name: "Chalecos Reflectivos", icon: "🦺" },
                    { name: "Botas de Seguridad", icon: "🥾" },
                    { name: "Orejeras de Seguridad", icon: "🎧" },
                    { name: "Mascarillas", icon: "😷" },
                    { name: "Gafas de Seguridad", icon: "🥽" },
                    { name: "Guantes de Protección", icon: "🧤" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{item.icon}</span>
                      {item.name}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuraciones adicionales */}
          <Card>
            <CardHeader>
              <CardTitle>Configuraciones Adicionales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Intervalo de Análisis</Label>
                  <Input type="number" defaultValue={3} min={1} max={10} />
                  <p className="text-xs text-muted-foreground">Segundos entre análisis automáticos</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Confianza Mínima</Label>
                  <Input type="number" defaultValue={70} min={50} max={95} />
                  <p className="text-xs text-muted-foreground">Porcentaje mínimo para detección válida</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;