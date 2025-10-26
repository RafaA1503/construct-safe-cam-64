import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Images, Lock, ArrowLeft, Download, Trash2, Eye, Calendar, Shield, RefreshCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImagePasswordDialog } from "@/components/ui/image-password-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { migrateLocalImagesToSupabase } from "@/utils/migrateImages";

interface CapturedImage {
  id: string;
  url: string;
  timestamp: Date;
  detections: string[];
  confidence: number;
  isProtected?: boolean;
}

const Gallery = () => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [imagePasswordDialog, setImagePasswordDialog] = useState<{isOpen: boolean, imageId: string}>({isOpen: false, imageId: ""});
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();

  const GALLERY_PASSWORD = "CarlayDavid2025";

  const calculateConfidence = (detections: string[]) => {
    const requiredEPP = ["casco", "chaleco", "gafas", "guantes", "mascarilla", "botas"];
    const detectedEPP = detections.filter(detection => requiredEPP.includes(detection));
    
    if (detectedEPP.length === requiredEPP.length) {
      return 1.0; // 100% if all required EPP is detected
    }
    
    // Calculate percentage based on detected vs required EPP
    const percentage = detectedEPP.length / requiredEPP.length;
    // Add some base confidence for having any EPP
    return Math.max(0.3, percentage);
  };

  const handleMigrateImages = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateLocalImagesToSupabase();
      
      if (result.success) {
        toast({
          title: "Migración completada",
          description: `${result.migrated} imágenes migradas exitosamente`,
        });
        
        // Reload images after migration
        loadImages();
      } else {
        toast({
          title: "Error en migración",
          description: "No se pudieron migrar todas las imágenes",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error en migración", 
        description: "Ocurrió un error durante la migración",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const loadImages = async () => {
    setIsLoading(true);
    try {
      // Load images from Supabase
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data: supabaseImages, error } = await supabase
        .from('captured_images')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error loading from Supabase:", error);
        throw error;
      }
      
      if (supabaseImages && supabaseImages.length > 0) {
        const formattedImages: CapturedImage[] = supabaseImages.map((img: any) => ({
          id: img.id,
          url: img.url,
          timestamp: new Date(img.timestamp || img.created_at),
          detections: img.detections || [],
          confidence: img.confidence || 0,
          isProtected: img.is_protected || false
        }));
        setImages(formattedImages);
        console.log("✅ Loaded images from Supabase:", formattedImages.length);
      } else {
        // Fallback to localStorage
        const savedImages = localStorage.getItem("captured_images");
        if (savedImages) {
          const parsedImages = JSON.parse(savedImages).map((img: any) => ({
            ...img,
            timestamp: new Date(img.timestamp),
            confidence: calculateConfidence(img.detections || [])
          }));
          setImages(parsedImages);
          console.log("📱 Loaded images from localStorage:", parsedImages.length);
        } else {
          // Demo data when no images exist
          const demoImages: CapturedImage[] = [
            {
              id: "demo-1",
              url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhc2NvIERldGVjdGFkbzwvdGV4dD48L3N2Zz4=",
              timestamp: new Date(Date.now() - 1000 * 60 * 30),
              detections: ["casco", "chaleco"],
              confidence: calculateConfidence(["casco", "chaleco"]),
              isProtected: true
            }
          ];
          setImages(demoImages);
          console.log("🎭 Showing demo data");
        }
      }
    } catch (error) {
      console.error("Error loading images:", error);
      // Fallback to localStorage on any error
      const savedImages = localStorage.getItem("captured_images");
      if (savedImages) {
        try {
          const parsedImages = JSON.parse(savedImages).map((img: any) => ({
            ...img,
            timestamp: new Date(img.timestamp),
            confidence: calculateConfidence(img.detections || [])
          }));
          setImages(parsedImages);
        } catch (parseError) {
          console.error("Error parsing localStorage images:", parseError);
          setImages([]);
        }
      } else {
        setImages([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (password === GALLERY_PASSWORD) {
        setIsAuthenticated(true);
        toast({
          title: "Acceso autorizado",
          description: "Bienvenido a la galería de imágenes",
        });
      } else {
        toast({
          title: "Acceso denegado",
          description: "Contraseña incorrecta",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleDownloadImage = (image: CapturedImage) => {
    try {
      // Create EPP_Images folder structure for download
      const link = document.createElement('a');
      link.href = image.url;
      const dateFolder = image.timestamp.toISOString().split('T')[0];
      const fileName = `EPP_${image.id}_${formatDate(image.timestamp).replace(/[\/\s:]/g, '_')}.jpg`;
      link.download = `EPP_Images/${dateFolder}/${fileName}`;
      link.click();
      
      toast({
        title: "Descarga iniciada",
        description: `Imagen guardada en carpeta EPP_Images/${dateFolder}`,
      });
    } catch (error) {
      toast({
        title: "Error en descarga",
        description: "No se pudo descargar la imagen",
        variant: "destructive",
      });
    }
  };


  const handleDeleteImage = async (imageId: string) => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Find the image to get the storage path
      const imageToDelete = images.find(img => img.id === imageId);
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('captured_images')
        .delete()
        .eq('id', imageId);
      
      if (dbError) {
        console.error("Error deleting from database:", dbError);
        throw dbError;
      }
      
      // Delete from storage if it's a Supabase storage URL
      if (imageToDelete?.url && imageToDelete.url.includes('supabase.co')) {
        // Extract file path from URL
        const urlParts = imageToDelete.url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        const { error: storageError } = await supabase.storage
          .from('epp-images')
          .remove([fileName]);
        
        if (storageError) {
          console.error("Error deleting from storage:", storageError);
          // Don't throw here as the DB deletion was successful
        }
      }
      
      // Update local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      setSelectedImage(null);
      setUnlockedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
      setSelectedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
      
      toast({
        title: "Imagen eliminada completamente",
        description: "La imagen ha sido eliminada de la base de datos y almacenamiento",
      });
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la imagen completamente",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelectedImages = async (imagesToDelete?: Set<string>) => {
    const targetImages = imagesToDelete || selectedImages;
    if (targetImages.size === 0) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const imageIds = Array.from(targetImages);
      
      // Find images to get storage paths
      const imagesToDeleteData = images.filter(img => imageIds.includes(img.id));
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('captured_images')
        .delete()
        .in('id', imageIds);
      
      if (dbError) {
        console.error("Error deleting from database:", dbError);
        throw dbError;
      }
      
      // Delete from storage
      const filesToDelete = imagesToDeleteData
        .filter(img => img.url && img.url.includes('supabase.co'))
        .map(img => {
          const urlParts = img.url.split('/');
          return urlParts[urlParts.length - 1];
        });
      
      if (filesToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('epp-images')
          .remove(filesToDelete);
        
        if (storageError) {
          console.error("Error deleting from storage:", storageError);
          // Don't throw here as the DB deletion was successful
        }
      }
      
      // Update local state
      setImages(prev => prev.filter(img => !imageIds.includes(img.id)));
      setSelectedImage(null);
      setSelectedImages(new Set());
      setIsSelectionMode(false);
      setUnlockedImages(prev => {
        const newSet = new Set(prev);
        imageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      setBrokenImages(prev => {
        const newSet = new Set(prev);
        imageIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      toast({
        title: "Imágenes eliminadas",
        description: `${imageIds.length} imágenes eliminadas exitosamente`,
      });
    } catch (error) {
      console.error("Error deleting images:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudieron eliminar todas las imágenes",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBrokenImages = async () => {
    if (brokenImages.size === 0) return;
    await handleDeleteSelectedImages(brokenImages);
  };

  const handleImageError = (imageId: string) => {
    setBrokenImages(prev => new Set([...prev, imageId]));
  };

  const handleImageSelection = (imageId: string, checked: boolean) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedImages(new Set(images.map(img => img.id)));
    } else {
      setSelectedImages(new Set());
    }
  };

  const handleImageClick = (image: CapturedImage) => {
    if (image.isProtected && !unlockedImages.has(image.id)) {
      setImagePasswordDialog({isOpen: true, imageId: image.id});
    } else {
      setSelectedImage(image);
    }
  };

  const handleImagePasswordCorrect = (imageId: string) => {
    setUnlockedImages(prev => new Set([...prev, imageId]));
    const image = images.find(img => img.id === imageId);
    if (image) {
      setSelectedImage(image);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4 relative overflow-hidden">
        {/* Futuristic background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-2xl animate-pulse-glow" style={{animationDelay: '1s'}} />
        
        <Card className="w-full max-w-md shadow-2xl border-0 bg-card/90 backdrop-blur-xl relative z-10">
          <CardHeader className="space-y-6 text-center pb-8">
            <div className="mx-auto relative">
              <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg animate-pulse-glow">
                <Lock className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="absolute -inset-2 bg-gradient-primary rounded-2xl blur-md opacity-20 animate-pulse-glow" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Galería Neural
              </CardTitle>
              <CardDescription className="text-base">
                Sistema de Seguridad Avanzado • Acceso Biométrico Virtual
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="gallery-password" className="flex items-center gap-3 text-sm font-medium">
                  <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-accent-foreground" />
                  </div>
                  Clave de Acceso Neural
                </Label>
                <Input
                  id="gallery-password"
                  type="password"
                  placeholder="∎∎∎∎∎∎∎∎∎∎∎∎∎∎"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-muted/50 border-border/50 focus:border-primary/50 focus:bg-background/80 transition-all duration-300"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="flex-1 h-12 border-border/50 hover:bg-muted/50 transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Regresar
                </Button>
                
                <Button 
                  type="submit" 
                  className="flex-1 h-12 bg-gradient-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Autenticando...
                    </div>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Acceso Seguro
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center p-4 bg-muted/20 rounded-lg border border-border/30">
                <div className="flex items-center justify-center gap-2 text-accent text-sm">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  Sistema Cuántico de Protección Activa
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card/30 to-muted relative">
      {/* Futuristic background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      {/* Header futurista */}
      <div className="bg-card/80 backdrop-blur-xl border-b border-border/30 shadow-xl relative z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/")}
                className="border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Portal Principal
              </Button>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <Images className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-primary rounded-2xl blur-sm opacity-30 animate-pulse-glow" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Neural Gallery
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Sistema de Análisis Cuántico • Detección EPP Avanzada
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-gradient-accent rounded-full shadow-lg">
                <div className="flex items-center gap-2 text-accent-foreground text-sm font-medium">
                  <div className="w-2 h-2 bg-accent-foreground/80 rounded-full animate-pulse" />
                  {images.length} Capturas Activas
                </div>
              </div>
              {brokenImages.size > 0 && (
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteBrokenImages}
                  className="transition-all duration-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpiar ({brokenImages.size} rotas)
                </Button>
              )}
              {!isSelectionMode ? (
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Seleccionar
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedImages(new Set());
                    }}
                    className="border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(selectedImages.size !== images.length)}
                    className="border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
                  >
                    {selectedImages.size === images.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                  </Button>
                   {selectedImages.size > 0 && (
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSelectedImages()}
                      className="transition-all duration-300"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar ({selectedImages.size})
                    </Button>
                  )}
                </div>
              )}
              <Button 
                variant="outline"
                size="sm"
                onClick={handleMigrateImages}
                disabled={isMigrating}
                className="border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
              >
                {isMigrating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary/50 border-t-primary rounded-full animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync Neural
                  </>
                )}
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 relative z-10">
        {images.length === 0 ? (
          <Card className="text-center py-16 bg-card/50 backdrop-blur-sm border-border/30">
            <CardContent className="space-y-6">
              <div className="relative mx-auto w-24 h-24">
                <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse-glow">
                  <Images className="w-12 h-12 text-primary-foreground" />
                </div>
                <div className="absolute -inset-2 bg-gradient-primary rounded-full blur-lg opacity-30 animate-pulse-glow" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Base de Datos Neural Vacía
                </h3>
                <p className="text-muted-foreground">
                  Aguardando activación de sensores cuánticos • Sistema EPP en standby
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {images.map((image) => (
              <Card key={image.id} className={`group overflow-hidden bg-card/70 backdrop-blur-sm border-border/30 hover:bg-card/90 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20 transition-all duration-500 hover:scale-105 ${selectedImages.has(image.id) ? 'ring-2 ring-primary border-primary' : ''}`}>
                <div className="relative overflow-hidden">
                  {isSelectionMode && (
                    <div className="absolute top-3 left-3 z-10">
                      <Checkbox
                        checked={selectedImages.has(image.id)}
                        onCheckedChange={(checked) => handleImageSelection(image.id, checked as boolean)}
                        className="bg-background/80 backdrop-blur-sm"
                      />
                    </div>
                  )}
                  <img 
                    src={image.isProtected && !unlockedImages.has(image.id) ? 
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmM2Y0ZjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlNWU3ZWIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PGNpcmNsZSBjeD0iMTYwIiBjeT0iOTAiIHI9IjQwIiBmaWxsPSIjNjM2NmYxIiBvcGFjaXR5PSIwLjgiLz48cmVjdCB4PSIxNDAiIHk9IjEwNSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjI1IiByeD0iOCIgZmlsbD0iIzYzNjZmMSIgb3BhY2l0eT0iMC44Ii8+PHRleHQgeD0iNTAlIiB5PSI3NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiM0ZjQ2ZTUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRhdG9zIEVuY3JpcHRhZG9zPC90ZXh0Pjwvc3ZnPg==" 
                      : image.url
                    } 
                    alt={`Captura ${image.id}`}
                    className="w-full h-52 object-cover cursor-pointer group-hover:scale-110 transition-transform duration-700"
                    onClick={() => isSelectionMode ? handleImageSelection(image.id, !selectedImages.has(image.id)) : handleImageClick(image)}
                    onError={() => handleImageError(image.id)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="absolute top-3 right-3 flex gap-2">
                    {image.isProtected && (
                      <div className="px-2 py-1 bg-destructive/90 backdrop-blur-sm rounded-lg border border-destructive/30">
                        <div className="flex items-center gap-1 text-destructive-foreground text-xs font-medium">
                          <Lock className="w-3 h-3" />
                          Encriptado
                        </div>
                      </div>
                    )}
                    <div className="px-2 py-1 bg-gradient-primary/90 backdrop-blur-sm rounded-lg border border-primary/30">
                      <div className="text-primary-foreground text-xs font-bold">
                        {Math.round(image.confidence * 100)}% IA
                      </div>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-6 h-6 bg-accent/20 rounded-md flex items-center justify-center">
                      <Calendar className="w-3 h-3 text-accent" />
                    </div>
                    <span className="font-mono">{formatDate(image.timestamp)}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {image.detections.map((detection, index) => (
                      <div key={index} className="px-2 py-1 bg-secondary/50 backdrop-blur-sm rounded-md border border-secondary/30">
                        <span className="text-secondary-foreground text-xs font-medium">{detection}</span>
                      </div>
                    ))}
                  </div>
                  
                  {!isSelectionMode && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleImageClick(image)}
                        className="flex-1 border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Análisis
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadImage(image)}
                        className="border-border/50 hover:bg-accent/10 hover:border-accent/30 transition-all duration-300"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteImage(image.id)}
                        className="border-border/50 hover:bg-destructive/10 hover:border-destructive/30 text-destructive hover:text-destructive transition-all duration-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de imagen ampliada */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>Captura EPP - {selectedImage.id}</DialogTitle>
                <DialogDescription>
                  Capturada el {formatDate(selectedImage.timestamp)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <img 
                  src={selectedImage.url} 
                  alt={`Captura ${selectedImage.id}`}
                  className="w-full max-h-96 object-contain rounded-lg"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Detecciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedImage.detections.map((detection, index) => (
                          <Badge key={index} className="bg-accent text-accent-foreground">
                            {detection}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Información</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Confianza:</span>
                        <Badge variant="outline">
                          {Math.round(selectedImage.confidence * 100)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>ID:</span>
                        <code className="text-xs bg-muted px-1 rounded">
                          {selectedImage.id}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => handleDownloadImage(selectedImage)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => handleDeleteImage(selectedImage.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de contraseña para imagen */}
      <ImagePasswordDialog
        isOpen={imagePasswordDialog.isOpen}
        onClose={() => setImagePasswordDialog({isOpen: false, imageId: ""})}
        onPasswordCorrect={() => handleImagePasswordCorrect(imagePasswordDialog.imageId)}
        imageId={imagePasswordDialog.imageId}
      />
    </div>
  );
};

export default Gallery;