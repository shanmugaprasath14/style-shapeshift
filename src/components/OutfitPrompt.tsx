import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

interface OutfitPromptProps {
  value: string;
  onChange: (value: string) => void;
}

export const OutfitPrompt = ({ value, onChange }: OutfitPromptProps) => {
  return (
    <div className="w-full">
      <label className="text-sm font-medium mb-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        Describe Your Dream Outfit
      </label>
      
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="E.g., Red formal suit with golden buttons, elegant black evening dress with sequins, casual denim jacket with patches..."
        className="min-h-[120px] glass resize-none text-base"
      />
      
      <p className="text-xs text-muted-foreground mt-2">
        Be specific about colors, style, patterns, and details for best results
      </p>
    </div>
  );
};
