import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Images, Lock, ArrowLeft, Download, Trash2, Eye, Calendar, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ImagePasswordDialog } from "@/components/ui/image-password-dialog";

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
  const [imagePasswordDialog, setImagePasswordDialog] = useState<{isOpen: boolean, imageId: string}>({isOpen: false, imageId: ""});
  const [unlockedImages, setUnlockedImages] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    // Cargar imágenes desde localStorage (demo)
    const savedImages = localStorage.getItem("captured_images");
    if (savedImages) {
      try {
        const parsedImages = JSON.parse(savedImages).map((img: any) => ({
          ...img,
          timestamp: new Date(img.timestamp),
          confidence: calculateConfidence(img.detections || [])
        }));
        setImages(parsedImages);
      } catch (error) {
        console.error("Error loading images:", error);
      }
    } else {
      // Datos de demo
      const demoImages: CapturedImage[] = [
        {
          id: "1",
          url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNhc2NvIERldGVjdGFkbzwvdGV4dD48L3N2Zz4=",
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          detections: ["casco", "chaleco"],
          confidence: calculateConfidence(["casco", "chaleco"]),
          isProtected: true
        },
        {
          id: "2", 
          url: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVQUCBDb21wbGV0bzwvdGV4dD48L3N2Zz4=",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          detections: ["casco", "chaleco", "gafas", "guantes", "mascarilla", "botas"],
          confidence: calculateConfidence(["casco", "chaleco", "gafas", "guantes", "mascarilla", "botas"]),
          isProtected: true
        }
      ];
      setImages(demoImages);
    }
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


  const handleDeleteImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    setSelectedImage(null);
    setUnlockedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(imageId);
      return newSet;
    });
    
    toast({
      title: "Imagen eliminada",
      description: "La imagen ha sido eliminada de la galería",
    });
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Galería Protegida</CardTitle>
              <CardDescription>
                Acceso restringido a imágenes capturadas del sistema EPP
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gallery-password" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Contraseña de Acceso
                </Label>
                <Input
                  id="gallery-password"
                  type="password"
                  placeholder="Ingrese la contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="transition-all duration-300 focus:shadow-industrial"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
                
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-rotate-loader" />
                      Verificando...
                    </div>
                  ) : (
                    "Acceder"
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2 text-accent">
                  <Shield className="w-4 h-4" />
                  Contenido protegido por seguridad
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  <Images className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Galería de Capturas EPP</h1>
                  <p className="text-muted-foreground">Imágenes con detecciones de equipos de protección</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-accent text-accent-foreground">
                {images.length} imágenes
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {images.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Images className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No hay imágenes capturadas</h3>
              <p className="text-muted-foreground">
                Las imágenes aparecerán aquí cuando el sistema detecte EPP
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="relative">
                  <img 
                    src={image.isProtected && !unlockedImages.has(image.id) ? 
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZDFkNWRiIi8+PGNpcmNsZSBjeD0iMTYwIiBjeT0iOTAiIHI9IjMwIiBmaWxsPSIjNmI3Mjg0Ii8+PHJlY3QgeD0iMTQ1IiB5PSIxMDAiIHdpZHRoPSIzMCIgaGVpZ2h0PSIyMCIgcng9IjUiIGZpbGw9IiM2YjcyODQiLz48dGV4dCB4PSI1MCUiIHk9IjcwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzc0MTUxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5JbWFnZW4gUHJvdGVnaWRhPC90ZXh0Pjwvc3ZnPg==" 
                      : image.url
                    } 
                    alt={`Captura ${image.id}`}
                    className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => handleImageClick(image)}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    {image.isProtected && (
                      <Badge className="bg-destructive text-destructive-foreground">
                        <Lock className="w-3 h-3 mr-1" />
                        Protegida
                      </Badge>
                    )}
                    <Badge className="bg-black/70 text-white">
                      {Math.round(image.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {formatDate(image.timestamp)}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {image.detections.map((detection, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {detection}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleImageClick(image)}
                        className="flex-1"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDownloadImage(image)}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteImage(image.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
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