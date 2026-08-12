import { supabase } from './supabase'

/**
 * Upload screenshot bukti SG Invitation ke bucket 'bukti-sg-invitation'
 * @param {File} file - File gambar dari input
 * @param {string} registrationId - UUID pendaftar untuk nama file unik
 * @returns {Promise<string>} Public URL file yang diupload
 */
export async function uploadBuktiSG(file, registrationId) {
  const ext = file.name.split('.').pop()
  const fileName = `${registrationId}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('bukti-sg-invitation')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from('bukti-sg-invitation')
    .getPublicUrl(fileName)

  return data.publicUrl
}

/**
 * Upload foto menu catering ke bucket 'catering-images' (admin only)
 * @param {File} file - File gambar dari input admin
 * @param {string} menuId - ID menu, misal 'nasi-goreng'
 * @returns {Promise<string>} Public URL file yang diupload
 */
export async function uploadCateringImage(file, menuId) {
  const ext = file.name.split('.').pop()
  const fileName = `${menuId}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('catering-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from('catering-images')
    .getPublicUrl(fileName)

  return data.publicUrl
}
