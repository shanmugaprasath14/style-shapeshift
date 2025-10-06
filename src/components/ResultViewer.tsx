import { useState, useEffect } from "react";
import { Download, RotateCw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface Frame {
  angle: string;
  imageUrl: string;
}

interface ResultViewerProps {
  frames: Frame[];
}

export const ResultViewer = ({ frames }: ResultViewerProps) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [rotationSpeed, setRotationSpeed] = useState(500);

  useEffect(() => {
    if (!isAutoRotating) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % frames.length);
    }, rotationSpeed);

    return () => clearInterval(interval);
  }, [isAutoRotating, rotationSpeed, frames.length]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = frames[currentFrameIndex].imageUrl;
    link.download = `ai-fashion-design-${frames[currentFrameIndex].angle}.png`;
    link.click();
    toast.success("Image downloaded!");
  };

  const handleDownloadAll = () => {
    frames.forEach((frame, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = frame.imageUrl;
        link.download = `ai-fashion-design-${frame.angle}.png`;
        link.click();
      }, index * 300);
    });
    toast.success("Downloading all frames...");
  };

  const handleManualRotate = (direction: number) => {
    setCurrentFrameIndex((prev) => {
      const newIndex = prev + direction;
      if (newIndex < 0) return frames.length - 1;
      if (newIndex >= frames.length) return 0;
      return newIndex;
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your 360° AI-Generated Design</h3>
        
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            title={isAutoRotating ? "Pause rotation" : "Auto rotate"}
          >
            {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} title="Download current frame">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadAll}>
            Download All
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl p-6 overflow-hidden">
        <div className="relative w-full flex items-center justify-center min-h-[600px] bg-background/50 rounded-lg">
          <img
            src={frames[currentFrameIndex].imageUrl}
            alt={`AI Generated Fashion Design - ${frames[currentFrameIndex].angle}`}
            className="max-w-full max-h-[600px] object-contain"
          />
          
          <div className="absolute bottom-4 left-4 glass px-4 py-2 rounded-lg text-sm">
            <span className="font-semibold">{frames[currentFrameIndex].angle}</span>
            <span className="text-muted-foreground ml-2">
              {currentFrameIndex + 1} / {frames.length}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleManualRotate(-1)}
              disabled={isAutoRotating}
            >
              <RotateCw className="w-4 h-4 rotate-180" />
            </Button>
            
            <Slider
              value={[currentFrameIndex]}
              max={frames.length - 1}
              step={1}
              onValueChange={([value]) => setCurrentFrameIndex(value)}
              className="flex-1"
              disabled={isAutoRotating}
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleManualRotate(1)}
              disabled={isAutoRotating}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Rotation Speed:</span>
            <Slider
              value={[2000 - rotationSpeed]}
              max={1500}
              min={200}
              step={100}
              onValueChange={([value]) => setRotationSpeed(2000 - value)}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">{((2000 - rotationSpeed) / 100).toFixed(0)}x</span>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {frames.map((frame, index) => (
            <button
              key={frame.angle}
              onClick={() => setCurrentFrameIndex(index)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                currentFrameIndex === index 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'border-transparent hover:border-primary/50'
              }`}
            >
              <img
                src={frame.imageUrl}
                alt={frame.angle}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] py-1 text-center">
                {frame.angle}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
