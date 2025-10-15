import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, LogOut, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface OutfitDesign {
  id: string;
  prompt: string;
  created_at: string;
  frames: Array<{
    angle: string;
    storage_path: string;
    url?: string;
  }>;
}

const Gallery = () => {
  const [designs, setDesigns] = useState<OutfitDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username || user.email?.split('@')[0] || 'User');
      }

      // Load designs with frames
      const { data: designsData, error } = await supabase
        .from('outfit_designs')
        .select(`
          id,
          prompt,
          created_at,
          outfit_frames (
            angle,
            storage_path
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for images
      const designsWithUrls = await Promise.all(
        (designsData || []).map(async (design) => {
          const framesWithUrls = await Promise.all(
            (design.outfit_frames || []).map(async (frame: any) => {
              const { data: urlData } = await supabase.storage
                .from('outfit-images')
                .createSignedUrl(frame.storage_path, 3600);
              
              return {
                angle: frame.angle,
                storage_path: frame.storage_path,
                url: urlData?.signedUrl
              };
            })
          );

          return {
            id: design.id,
            prompt: design.prompt,
            created_at: design.created_at,
            frames: framesWithUrls
          };
        })
      );

      setDesigns(designsWithUrls);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load your designs");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const handleDelete = async (designId: string) => {
    try {
      const { error } = await supabase
        .from('outfit_designs')
        .delete()
        .eq('id', designId);

      if (error) throw error;

      setDesigns(designs.filter(d => d.id !== designId));
      toast.success("Design deleted");
    } catch (error) {
      console.error('Error deleting design:', error);
      toast.error("Failed to delete design");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold gradient-text">My Designs</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-semibold text-foreground">{username}</span>
              </span>
              <Button onClick={() => navigate("/designer")}>
                <Plus className="w-4 h-4 mr-2" />
                New Design
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {designs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-6">
              You haven't created any designs yet
            </p>
            <Button onClick={() => navigate("/designer")} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Design
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((design) => (
              <Card key={design.id} className="glass overflow-hidden group">
                <CardContent className="p-0">
                  <div className="relative aspect-square bg-muted">
                    {design.frames[0]?.url && (
                      <img
                        src={design.frames[0].url}
                        alt={design.prompt}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(design.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium line-clamp-2 mb-2">
                      {design.prompt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(design.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {design.frames.length} angles
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;