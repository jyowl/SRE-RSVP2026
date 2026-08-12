/**
 * Validasi kode unik event via Supabase RPC
 * @param {import('../lib/supabase').supabase} supabase
 * @param {string} code - Kode unik yang diinput user
 * @returns {Promise<{event_id, nama_acara, catering_options}|null>}
 */
export async function validateEventCode(supabase, code) {
  const { data, error } = await supabase.rpc('validate_event_code', {
    input_code: code.trim().toUpperCase(),
  })
  if (error) throw error
  if (!data || data.length === 0) return null
  return data[0]
}

/**
 * Format tanggal ke format Indonesia
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date, contoh: "15 Agustus 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Export array of objects to CSV dan trigger download
 * @param {object[]} data
 * @param {string} filename
 */
export function exportToCSV(data, filename = 'data-registrasi.csv') {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? ''
          return `"${String(val).replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Singkatan jurusan Telkom University
 */
export const JURUSAN_OPTIONS = [
  'Teknik Informatika',
  'Sistem Informasi',
  'Teknik Elektro',
  'Teknik Telekomunikasi',
  'Teknik Komputer',
  'Teknik Industri',
  'Manajemen Bisnis Telekomunikasi dan Informatika',
  'Ilmu Komunikasi',
  'Administrasi Bisnis',
  'Akuntansi',
  'Desain Komunikasi Visual',
  'Kriya',
  'Lainnya',
]
