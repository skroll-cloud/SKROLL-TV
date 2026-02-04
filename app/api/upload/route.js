import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Configuration pour accepter les gros fichiers
export const config = {
  api: {
    bodyParser: false,
  },
}

// Augmenter la limite de taille (60 secondes timeout, 50MB max)
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')
    
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Vérifier la taille (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 50MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${safeName}`
    
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Erreur Supabase Storage:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    return NextResponse.json({ 
      success: true,
      url: urlData.publicUrl
    })

  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
