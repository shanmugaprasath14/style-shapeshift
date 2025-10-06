import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log('Generating 8-angle outfit rotation...');

    const generatedFrames: { angle: string; imageUrl: string }[] = [];

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
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI gateway error for ${angle.name}:`, response.status, errorText);
        throw new Error(`AI gateway error for ${angle.name}: ${response.status}`);
      }

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        throw new Error(`No image generated for ${angle.name}`);
      }

      generatedFrames.push({
        angle: angle.name,
        imageUrl: generatedImageUrl
      });

      console.log(`Successfully generated ${angle.name} view`);
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
