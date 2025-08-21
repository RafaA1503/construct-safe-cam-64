import { useState, useEffect } from "react";
import { Shield, Eye, Cpu, Zap } from "lucide-react";

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader = ({ onComplete }: PreloaderProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-8">
        {/* Logo profesional */}
        <div className="w-32 h-32 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-lg">
          <Shield className="w-16 h-16 text-primary-foreground" strokeWidth={1.5} />
        </div>

        {/* Título profesional */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-foreground">
            SafeCam
          </h1>
          <p className="text-lg text-muted-foreground">
            Sistema de Detección de EPP
          </p>
          <p className="text-sm text-muted-foreground">
            Versión 3.0.1 | Build 2025.01
          </p>
        </div>

        {/* Barra de progreso profesional */}
        <div className="w-80 mx-auto space-y-4">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-primary font-medium">Sistema</div>
              <div className="text-muted-foreground">En línea</div>
            </div>
            <div className="text-center">
              <div className="text-primary font-medium">Progreso</div>
              <div className="text-muted-foreground">{progress}%</div>
            </div>
            <div className="text-center">
              <div className="text-primary font-medium">Estado</div>
              <div className="text-muted-foreground">Cargando</div>
            </div>
          </div>
        </div>

        {/* Indicadores de módulos */}
        <div className="flex justify-center space-x-6">
          {[
            { name: 'Núcleo IA', icon: Cpu },
            { name: 'Visión', icon: Eye },
            { name: 'Análisis', icon: Zap },
            { name: 'Seguridad', icon: Shield }
          ].map((module, i) => (
            <div key={module.name} className="text-center space-y-2">
              <div className="w-10 h-10 mx-auto bg-muted rounded-lg flex items-center justify-center">
                <module.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-xs text-muted-foreground">{module.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};