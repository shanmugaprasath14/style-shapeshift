import { useState } from "react";
import { Hero } from "@/components/Hero";
import { ImageUpload } from "@/components/ImageUpload";
import { OutfitPrompt } from "@/components/OutfitPrompt";
import { ResultViewer } from "@/components/ResultViewer";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [showDesigner, setShowDesigner] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultFrames, setResultFrames] = useState<Array<{angle: string, imageUrl: string}> | null>(null);

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim()) {
      toast.error("Please upload an image and describe your outfit");
      return;
    }

    setIsGenerating(true);
    setResultFrames(null);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      
      const imageBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });

      toast.info("Generating 8-angle rotation view... This may take a moment.");

      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-outfit', {
        body: { imageBase64, prompt }
      });

      if (error) {
        if (error.message.includes('Rate limit')) {
          toast.error("Rate limit reached. Please try again in a moment.");
        } else if (error.message.includes('Payment required')) {
          toast.error("AI usage limit reached. Please add credits to continue.");
        } else {
          toast.error("Failed to generate outfit. Please try again.");
        }
        console.error('Error:', error);
        return;
      }

      if (data?.frames && Array.isArray(data.frames)) {
        setResultFrames(data.frames);
        toast.success("Your 360° AI fashion design is ready!");
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewDesign = () => {
    setSelectedImage(null);
    setPrompt("");
    setResultFrames(null);
  };

  if (!showDesigner) {
    return <Hero onGetStarted={() => setShowDesigner(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold gradient-text">AI Fashion Studio</h1>
            <Button variant="ghost" onClick={() => setShowDesigner(false)}>
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {!resultFrames ? (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">Create Your Design</h2>
              <p className="text-muted-foreground text-lg">
                Upload your photo and let AI transform your style
              </p>
            </div>

            <div className="glass rounded-2xl p-8 space-y-8">
              <ImageUpload 
                onImageSelected={setSelectedImage}
                selectedImage={selectedImage}
              />

              <OutfitPrompt 
                value={prompt}
                onChange={setPrompt}
              />

              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!selectedImage || !prompt.trim() || isGenerating}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Your Design...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate 360° AI Design
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <ResultViewer frames={resultFrames} />
            
            <div className="flex gap-4 justify-center mt-8">
              <Button
                size="lg"
                variant="outline"
                onClick={handleNewDesign}
                className="min-w-[200px]"
              >
                Create New Design
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
