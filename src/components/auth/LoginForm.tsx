import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, User, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onLogin: () => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simular verificación de credenciales
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (username === "David" && password === "Carla@2025") {
      toast({
        title: "Acceso autorizado",
        description: "Bienvenido al sistema SafeCam",
      });
      onLogin();
    } else {
      toast({
        title: "Error de autenticación",
        description: "Usuario o contraseña incorrectos",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto w-20 h-20 bg-primary rounded-xl flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground">
              Acceso Seguro
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sistema de Detección de EPP v3.0
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Verificando...</span>
                </div>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Conexión segura</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};