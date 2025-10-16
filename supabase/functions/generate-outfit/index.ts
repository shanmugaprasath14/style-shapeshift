import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANGLES = [
  { name: 'front', description: 'facing directly forward' },
  { name: '45-left', description: 'rotated 45 degrees to the left, showing left side profile' },
  { name: 'left', description: 'complete left side profile view' },
  { name: '135-left', description: 'rotated 135 degrees to the left, showing left back' },
  { name: 'back', description: 'complete back view' },
  { name: '135-right', description: 'rotated 135 degrees to the right, showing right back' },
  { name: 'right', description: 'complete right side profile view' },
  { name: '45-right', description: 'rotated 45 degrees to the right, showing right side profile' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get auth header and create Supabase client
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating 8-angle outfit rotation for user:', user.id);

    // Create outfit design record first
    const { data: outfitDesign, error: designError } = await supabase
      .from('outfit_designs')
      .insert({
        user_id: user.id,
        prompt: prompt
      })
      .select()
      .single();

    if (designError || !outfitDesign) {
      console.error('Failed to create outfit design:', designError);
      throw new Error('Failed to create outfit design record');
    }

    const generatedFrames: { angle: string; imageUrl: string }[] = [];
    const frameRecords = [];

    for (const angle of ANGLES) {
      console.log(`Generating ${angle.name} view...`);
      
      // Use Gemini Flash Image Preview for image generation
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Transform this person's outfit to: ${prompt}. Show the person ${angle.description}. Keep the person's body shape, height, and proportions exactly the same. Only change the clothing to match the description. Maintain realistic lighting, textures, and shadows. Make it photorealistic and consistent with other angles.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.', code: 429 }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.', code: 402 }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI gateway error for ${angle.name}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`AI gateway error for ${angle.name}: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Response data for ${angle.name}:`, JSON.stringify(data).substring(0, 200));
      
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        console.error(`No image in response for ${angle.name}. Response:`, JSON.stringify(data));
        throw new Error(`No image generated for ${angle.name}`);
      }

      // Convert base64 to blob for storage
      const base64Data = generatedImageUrl.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      // Upload to storage
      const fileName = `${user.id}/${outfitDesign.id}/${angle.name}.png`;
      const { error: uploadError } = await supabase.storage
        .from('outfit-images')
        .upload(fileName, binaryData, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
      } else {
        // Store frame metadata
        frameRecords.push({
          outfit_design_id: outfitDesign.id,
          angle: angle.name,
          storage_path: fileName
        });
      }

      generatedFrames.push({
        angle: angle.name,
        imageUrl: generatedImageUrl
      });

      console.log(`Successfully generated ${angle.name} view`);
    }

    // Save frame records to database
    if (frameRecords.length > 0) {
      const { error: framesError } = await supabase
        .from('outfit_frames')
        .insert(frameRecords);

      if (framesError) {
        console.error('Error saving frame records:', framesError);
      }
    }

    console.log('Successfully generated all 8 angle views');

    return new Response(
      JSON.stringify({ frames: generatedFrames }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-outfit:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});