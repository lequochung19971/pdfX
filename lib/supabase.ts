import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { AnnotationData } from "./types"

// ------------------------------------------------------------
// Graceful fallback when env vars are missing so preview works
// ------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

/** `supabase` is null while running locally without credentials */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

if (!supabase) {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.\n" +
      "Annotation saving is disabled in local preview.\n" +
      "Add the variables to `.env.local` (or your Vercel project) to enable cloud persistence.",
  )
}

// --------------------------
// Helper persistence methods
// --------------------------
export const saveAnnotation = async (pdfId: string, data: AnnotationData) => {
  if (!supabase) return // no-op in offline mode

  const { error } = await supabase.from("pdf_annotations").upsert({
    pdf_id: pdfId,
    annotations: data.annotations,
    highlights: data.highlights,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

export const getAnnotations = async (pdfId: string): Promise<AnnotationData> => {
  if (!supabase) {
    // offline mode → return empty annotations
    return { annotations: [], highlights: [] }
  }

  const { data, error } = await supabase
    .from("pdf_annotations")
    .select("annotations, highlights")
    .eq("pdf_id", pdfId)
    .single()

  if (error && error.code !== "PGRST116") throw error

  return {
    annotations: data?.annotations || [],
    highlights: data?.highlights || [],
  }
}
