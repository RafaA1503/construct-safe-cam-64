import { useState } from "react";
import { Preloader } from "@/components/ui/preloader";
import { CameraInterface } from "@/components/camera/CameraInterface";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  const handlePreloaderComplete = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <Preloader onComplete={handlePreloaderComplete} />;
  }

  return <CameraInterface />;
};

export default Index;
