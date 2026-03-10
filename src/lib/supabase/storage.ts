import { createClient } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

export async function uploadImage(file: File): Promise<string | null> {
  const supabase = createClient()
  
  // 5MB max check (though requested we also do client side, this double checks)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File exceeds 5MB limit')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${uuidv4()}.${fileExt}`
  const filePath = `post_images/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('images') // Assumes an 'images' bucket is created and public in Supabase
    .upload(filePath, file)

  if (uploadError) {
    console.error('Upload Error:', uploadError)
    throw uploadError
  }

  const { data } = supabase.storage.from('images').getPublicUrl(filePath)
  return data.publicUrl
}
