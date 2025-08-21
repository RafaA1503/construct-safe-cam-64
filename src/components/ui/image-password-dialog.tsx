import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImagePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordCorrect: () => void;
  imageId: string;
}

export function ImagePasswordDialog({ isOpen, onClose, onPasswordCorrect, imageId }: ImagePasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Contraseña específica para cada imagen basada en su ID
  const getImagePassword = (id: string) => `IMG${id}2025`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (password === getImagePassword(imageId)) {
        onPasswordCorrect();
        onClose();
        toast({
          title: "Acceso autorizado",
          description: "Imagen desbloqueada correctamente",
        });
      } else {
        toast({
          title: "Acceso denegado",
          description: "Contraseña incorrecta para esta imagen",
          variant: "destructive",
        });
      }
      setPassword("");
      setIsLoading(false);
    }, 800);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Imagen Protegida
          </DialogTitle>
          <DialogDescription>
            Esta imagen requiere contraseña para ser visualizada. 
            <br />
            <span className="text-xs text-muted-foreground">
              Pista: IMG{imageId}2025
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Contraseña de la Imagen
            </Label>
            <Input
              id="image-password"
              type="password"
              placeholder="Ingrese la contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="transition-all duration-300"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </div>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Acceder
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}