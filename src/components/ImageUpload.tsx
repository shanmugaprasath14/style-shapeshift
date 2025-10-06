import { useState, useCallback } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageUploadProps {
  onImageSelected: (file: File) => void;
  selectedImage: File | null;
}

export const ImageUpload = ({ onImageSelected, selectedImage }: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
      setPreview(URL.createObjectURL(file));
    } else {
      toast.error("Please upload a valid image file");
    }
  }, [onImageSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    onImageSelected(null as any);
    setPreview(null);
  };

  return (
    <div className="w-full">
      <label className="text-sm font-medium mb-2 block">Upload Your Photo</label>
      
      {preview ? (
        <div className="relative glass rounded-xl p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10"
            onClick={clearImage}
          >
            <X className="w-4 h-4" />
          </Button>
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-64 object-contain rounded-lg"
          />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            glass rounded-xl border-2 border-dashed transition-all cursor-pointer
            ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
          `}
        >
          <label className="flex flex-col items-center justify-center py-12 px-6 cursor-pointer">
            <Upload className={`w-12 h-12 mb-4 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-lg font-medium mb-2">
              {isDragging ? 'Drop your image here' : 'Drag & drop your photo'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};
