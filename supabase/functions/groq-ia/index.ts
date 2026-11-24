import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({ error: 'Falta la variable de entorno GROQ_API_KEY en Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    // --------------------------------------------------------------------------
    // 1. TRANSCRIPCIÓN DE AUDIO (Whisper LPU: ~200ms)
    // --------------------------------------------------------------------------
    if (action === 'transcribe' || req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData()
      const audioFile = formData.get('file') as File | null

      if (!audioFile) {
        return new Response(
          JSON.stringify({ error: 'No se envió ningún archivo de audio en el campo "file"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const groqFormData = new FormData()
      groqFormData.append('file', audioFile)
      groqFormData.append('model', 'whisper-large-v3-turbo')
      groqFormData.append('language', 'es')
      groqFormData.append('response_format', 'json')

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: groqFormData,
      })

      if (!whisperRes.ok) {
        const err = await whisperRes.text()
        return new Response(JSON.stringify({ error: `Error Groq Whisper: ${err}` }), {
          status: whisperRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const whisperData = await whisperRes.json()
      return new Response(JSON.stringify({ text: whisperData.text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --------------------------------------------------------------------------
    // 2. ESTRUCTURACIÓN DE REPORTE Y RESUMEN PARA CLIENTE (Llama 3.3 70B)
    // --------------------------------------------------------------------------
    const body = await req.json()
    const { transcript, etapas = [] } = body

    if (!transcript) {
      return new Response(JSON.stringify({ error: 'El campo "transcript" es requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const systemPrompt = `Eres el asistente de ingeniería civil y control de obras de Avanxapp.
Tu trabajo es procesar el dictado informal de un ingeniero residente en obra y transformarlo en un JSON estrictamente estructurado.

Las etapas activas del proyecto son:
${JSON.stringify(etapas, null, 2)}

Reglas de extracción:
1. "etapa_id": Identifica el ID de la etapa a la que se refiere el reporte. Si no coincide con ninguna, pon null.
2. "cantidad_reportada": Número físico de avance ejecutado hoy (ej. si dice "25 metros cuadrados", extrae 25). Si no menciona cantidad numérica exacta, pon 0.
3. "unidad": Unidad de medida detectada ('m2', 'm3', 'ml', 'und', o null).
4. "nota_tecnica": Redacción técnica, clara y formal del avance para el libro de obra.
5. "resumen_cliente": Redacción cálida, humana, transparente y sin tecnicismos pesados para que el cliente final (dueño de la obra) entienda qué se hizo y esté tranquilo.
6. "clima": Detecta si mencionó clima ('soleado', 'lluvia', 'nublado', o null).
7. "personal_activo": Número de operarios o ayudantes presentes si se mencionó, sino null.
8. "incidencia": Si reportó problemas, retrasos o materiales rotos, resúmelo aquí, sino null.

Devuelve ÚNICAMENTE un objeto JSON válido con estas claves:
{
  "etapa_id": string | null,
  "cantidad_reportada": number,
  "unidad": string | null,
  "nota_tecnica": string,
  "resumen_cliente": string,
  "clima": string | null,
  "personal_activo": number | null,
  "incidencia": string | null
}`

    const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    if (!chatRes.ok) {
      const err = await chatRes.text()
      return new Response(JSON.stringify({ error: `Error Groq LLM: ${err}` }), {
        status: chatRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const chatData = await chatRes.json()
    const content = JSON.parse(chatData.choices[0].message.content)

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
