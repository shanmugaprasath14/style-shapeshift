-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create outfit_designs table to store generated outfit metadata
CREATE TABLE public.outfit_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on outfit_designs
ALTER TABLE public.outfit_designs ENABLE ROW LEVEL SECURITY;

-- Outfit designs policies
CREATE POLICY "Users can view their own designs"
  ON public.outfit_designs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own designs"
  ON public.outfit_designs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own designs"
  ON public.outfit_designs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own designs"
  ON public.outfit_designs FOR DELETE
  USING (auth.uid() = user_id);

-- Create outfit_frames table to store individual frame URLs
CREATE TABLE public.outfit_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_design_id UUID REFERENCES public.outfit_designs(id) ON DELETE CASCADE NOT NULL,
  angle TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on outfit_frames
ALTER TABLE public.outfit_frames ENABLE ROW LEVEL SECURITY;

-- Outfit frames policies
CREATE POLICY "Users can view frames of their own designs"
  ON public.outfit_frames FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outfit_designs
      WHERE outfit_designs.id = outfit_frames.outfit_design_id
      AND outfit_designs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert frames for their own designs"
  ON public.outfit_frames FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outfit_designs
      WHERE outfit_designs.id = outfit_frames.outfit_design_id
      AND outfit_designs.user_id = auth.uid()
    )
  );

-- Create storage bucket for outfit images
INSERT INTO storage.buckets (id, name, public)
VALUES ('outfit-images', 'outfit-images', false);

-- Storage policies for outfit images
CREATE POLICY "Users can upload their own outfit images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'outfit-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own outfit images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'outfit-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own outfit images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'outfit-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_outfit_designs_updated_at
  BEFORE UPDATE ON public.outfit_designs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();