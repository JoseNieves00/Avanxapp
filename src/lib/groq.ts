/**
 * Cliente frontend para Groq IA (Voz a texto y Estructuración)
 * Se conecta a la Edge Function segura o a la API de Groq si hay key local.
 */

export interface EtapaContexto {
  id: string
  nombre: string
  unidad_medida?: string
  cantidad_total?: number
  cantidad_acumulada?: number
}

export interface EstructuraReporteIA {
  etapa_id: string | null
  cantidad_reportada: number
  unidad: string | null
  nota_tecnica: string
  resumen_cliente: string
  clima: 'soleado' | 'lluvia' | 'nublado' | null
  personal_activo: number | null
  incidencia: string | null
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const LOCAL_GROQ_KEY = import.meta.env.GROQ_API_KEY

/**
 * Transcribe un archivo o blob de audio usando Groq Whisper LPU
 */
export async function transcribirAudioConGroq(audioBlob: Blob): Promise<string> {
  // 1. Si hay Supabase configurado, usamos la Edge Function
  if (SUPABASE_URL && !SUPABASE_URL.includes('tu-proyecto')) {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')

    const res = await fetch(`${SUPABASE_URL}/functions/v1/groq-ia/transcribe`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
      },
      body: formData,
    })

    if (!res.ok) {
      throw new Error(`Error en transcripción: ${await res.text()}`)
    }
    const data = await res.json()
    return data.text as string
  }

  // 2. Fallback para desarrollo directo con GROQ_API_KEY
  if (LOCAL_GROQ_KEY) {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('language', 'es')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOCAL_GROQ_KEY}`,
      },
      body: formData,
    })

    if (!res.ok) {
      throw new Error(`Error directo Groq: ${await res.text()}`)
    }
    const data = await res.json()
    return data.text as string
  }

  // 3. Fallback mock si no hay llaves configuradas todavía
  return 'Hoy avanzamos 15 metros cuadrados de enchape en baño principal con 3 oficiales, clima soleado sin novedades.'
}

/**
 * Estructura una transcripción de voz en datos matemáticos y resumen para cliente
 */
export async function estructurarReporteConGroq(
  transcript: string,
  etapas: EtapaContexto[],
): Promise<EstructuraReporteIA> {
  if (SUPABASE_URL && !SUPABASE_URL.includes('tu-proyecto')) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/groq-ia`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, etapas }),
    })

    if (!res.ok) {
      throw new Error(`Error al estructurar reporte: ${await res.text()}`)
    }
    return (await res.json()) as EstructuraReporteIA
  }

  if (LOCAL_GROQ_KEY) {
    const systemPrompt = `Eres el asistente de ingeniería civil de Avanxapp.
Procesa el dictado del ingeniero y devuelve ÚNICAMENTE un JSON con:
{
  "etapa_id": string | null,
  "cantidad_reportada": number,
  "unidad": string | null,
  "nota_tecnica": string,
  "resumen_cliente": string,
  "clima": string | null,
  "personal_activo": number | null,
  "incidencia": string | null
}
Etapas: ${JSON.stringify(etapas)}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOCAL_GROQ_KEY}`,
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

    if (!res.ok) {
      throw new Error(`Error directo Groq LLM: ${await res.text()}`)
    }
    const data = await res.json()
    return JSON.parse(data.choices[0].message.content) as EstructuraReporteIA
  }

  // Fallback inteligente mock si no hay backend activo aún
  const etapaEncontrada = etapas.find(e =>
    transcript.toLowerCase().includes(e.nombre.toLowerCase())
  ) ?? etapas[0]

  return {
    etapa_id: etapaEncontrada?.id ?? null,
    cantidad_reportada: 15,
    unidad: 'm2',
    nota_tecnica: `Avance reportado: ${transcript}`,
    resumen_cliente: 'Hoy avanzamos significativamente en los acabados del baño principal. La instalación va conforme a lo programado.',
    clima: 'soleado',
    personal_activo: 3,
    incidencia: null,
  }
}
