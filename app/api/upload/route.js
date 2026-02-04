import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { fileName, contentType } = await request.json()
    
    if (!fileName) {
      return NextResponse.json({ error: 'fileName requis' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fullPath = `${timestamp}-${safeName}`

    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl(fullPath)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fullPath)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: fullPath,
      publicUrl: publicUrlData.publicUrl
    })

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { fileName, contentType } = await request.json()
    
    if (!fileName) {
      return NextResponse.json({ error: 'fileName requis' }, { status: 400 })
    }

    const timestamp = Date.now()
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fullPath = `${timestamp}-${safeName}`

    // Créer une URL signée pour upload direct
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl(fullPath)

    if (error) {
      console.error('Signed URL error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // URL publique pour après l'upload
    const { data: publicUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(fullPath)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: fullPath,
      publicUrl: publicUrlData.publicUrl
    })

  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
