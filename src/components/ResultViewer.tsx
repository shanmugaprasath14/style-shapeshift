import { Suspense } from "react";
import { Download, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

interface ResultViewerProps {
  imageUrl: string;
}

function ImageMesh({ imageUrl }: { imageUrl: string }) {
  const texture = useTexture(imageUrl);
  
  return (
    <mesh>
      <planeGeometry args={[4, 6]} />
      <meshStandardMaterial 
        map={texture} 
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

export const ResultViewer = ({ imageUrl }: ResultViewerProps) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'ai-fashion-design.png';
    link.click();
    toast.success("Image downloaded!");
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Your AI-Generated Design</h3>
        
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl p-6 overflow-hidden">
        <div className="relative w-full h-[600px] bg-background/50 rounded-lg">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            gl={{ preserveDrawingBuffer: true }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <directionalLight position={[-5, -5, -5]} intensity={0.5} />
            
            <Suspense fallback={null}>
              <ImageMesh imageUrl={imageUrl} />
            </Suspense>
            
            <OrbitControls 
              enableZoom={true}
              enablePan={true}
              enableRotate={true}
              autoRotate={false}
              maxDistance={10}
              minDistance={2}
            />
          </Canvas>
          
          <div className="absolute bottom-4 left-4 glass px-4 py-2 rounded-lg text-sm text-muted-foreground">
            <Maximize2 className="w-4 h-4 inline mr-2" />
            Drag to rotate • Scroll to zoom • Right-click to pan
          </div>
        </div>
      </div>
    </div>
  );
};
