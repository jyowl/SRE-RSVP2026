import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { uploadCateringImage } from '../../lib/storage'
import AdminSidebar from '../../components/layout/AdminSidebar'

function generateMenuId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 30)
}

export default function NewEventPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    nama_acara: '',
    deskripsi: '',
    kode_unik: '',
    tanggal_acara: '',
    jam_acara: '',
  })
  const [errors, setErrors] = useState({})

  // Catering menu items
  const [menuItems, setMenuItems] = useState([]) // { id, name, price, imageFile, imagePreview, imageUrl }
  const [newMenu, setNewMenu] = useState({ name: '', price: '', imageFile: null, imagePreview: null })

  function setField(key, val) {
    setForm((p) => ({ ...p, [key]: val }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  // Handle new menu image pick
  function handleMenuImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setNewMenu((p) => ({
      ...p,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }))
  }

  function addMenuItem() {
    if (!newMenu.name.trim()) {
      toast.error('Nama menu wajib diisi')
      return
    }
    if (!newMenu.imageFile) {
      toast.error('Foto menu wajib diupload')
      return
    }
    const priceNum = newMenu.price ? parseInt(newMenu.price.replace(/\D/g, ''), 10) : null
    const id = generateMenuId(newMenu.name) + '-' + Date.now()
    setMenuItems((p) => [...p, {
      id,
      name: newMenu.name.trim(),
      price: priceNum,
      imageFile: newMenu.imageFile,
      imagePreview: newMenu.imagePreview,
      imageUrl: null,
    }])
    setNewMenu({ name: '', price: '', imageFile: null, imagePreview: null })
  }

  function removeMenuItem(id) {
    setMenuItems((p) => p.filter((m) => m.id !== id))
  }

  function validate() {
    const errs = {}
    if (!form.nama_acara.trim()) errs.nama_acara = 'Nama acara wajib diisi'
    if (!form.kode_unik.trim()) errs.kode_unik = 'Kode unik wajib diisi'
    else if (!/^[A-Z0-9_-]{2,20}$/i.test(form.kode_unik.trim())) errs.kode_unik = 'Kode hanya boleh huruf, angka, - dan _ (2-20 karakter)'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Lengkapi form terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      // 0. Ambil user yang sedang login
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Sesi login tidak ditemukan. Silakan login ulang.')
        navigate('/admin/login')
        return
      }

      // 1. Upload semua foto catering
      const uploadedMenus = []
      for (const item of menuItems) {
        if (item.imageFile) {
          toast.loading(`Mengupload foto "${item.name}"...`, { id: 'upload-catering' })
          const url = await uploadCateringImage(item.imageFile, item.id)
          uploadedMenus.push({ id: item.id, name: item.name, image_url: url, price: item.price ?? null })
        }
      }
      toast.dismiss('upload-catering')

      // 2. Insert event to DB
      const { error } = await supabase.from('events').insert({
        nama_acara: form.nama_acara.trim(),
        deskripsi: form.deskripsi.trim() || null,
        kode_unik: form.kode_unik.trim().toUpperCase(),
        tanggal_acara: form.tanggal_acara || null,
        jam_acara: form.jam_acara || null,
        catering_options: uploadedMenus,
        created_by: user.id,   // ← wajib untuk RLS policy
      })

      if (error) throw error

      toast.success('Event berhasil dibuat!')
      navigate('/admin/dashboard')
    } catch (err) {
      console.error(err)
      if (err.code === '23505') {
        setErrors({ kode_unik: 'Kode unik sudah digunakan. Coba kode lain.' })
        toast.error('Kode unik sudah ada, ganti kode.')
      } else {
        toast.error(err.message || 'Gagal membuat event')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '16px' }}>
            ← Kembali
          </button>
          <div className="section-tag">Admin Panel</div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Buat Event Baru</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ maxWidth: '680px' }}>

          {/* Info Event */}
          <div className="card-glass" style={{ marginBottom: '24px' }}>
            <h2 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '20px' }}>
              Informasi Acara
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required" htmlFor="ev-nama">Nama Acara</label>
                <input
                  id="ev-nama"
                  className={`form-input ${errors.nama_acara ? 'error' : ''}`}
                  type="text"
                  value={form.nama_acara}
                  onChange={(e) => setField('nama_acara', e.target.value)}
                  placeholder="Contoh: Rapat Anggota SRE Telkom 2026"
                />
                {errors.nama_acara && <p className="form-error"><span>⚠️</span> {errors.nama_acara}</p>}
              </div>

              <div className="form-group">
                <label className="form-label required" htmlFor="ev-kode">
                  Kode Unik Acara
                </label>
                <input
                  id="ev-kode"
                  className={`form-input ${errors.kode_unik ? 'error' : ''}`}
                  type="text"
                  value={form.kode_unik}
                  onChange={(e) => setField('kode_unik', e.target.value.toUpperCase())}
                  placeholder="Contoh: SRE-2026-RA"
                  maxLength={20}
                  style={{ letterSpacing: '0.1em', fontWeight: 700 }}
                />
                {errors.kode_unik
                  ? <p className="form-error"><span>⚠️</span> {errors.kode_unik}</p>
                  : <p className="form-hint">Kode ini yang akan disebarkan ke peserta untuk akses formulir.</p>
                }
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ev-tanggal">Tanggal Acara</label>
                <input
                  id="ev-tanggal"
                  className="form-input"
                  type="date"
                  value={form.tanggal_acara}
                  onChange={(e) => setField('tanggal_acara', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ev-jam">Jam Acara</label>
                <input
                  id="ev-jam"
                  className="form-input"
                  type="time"
                  value={form.jam_acara}
                  onChange={(e) => setField('jam_acara', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ev-deskripsi">Deskripsi Acara</label>
                <textarea
                  id="ev-deskripsi"
                  className="form-input"
                  value={form.deskripsi}
                  onChange={(e) => setField('deskripsi', e.target.value)}
                  placeholder="Deskripsikan acara ini (opsional)"
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>

          {/* Catering Menu */}
          <div className="card-glass" style={{ marginBottom: '24px' }}>
            <h2 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '8px' }}>
              Menu Catering
            </h2>
            <p className="form-hint" style={{ marginBottom: '20px' }}>
              Tambahkan pilihan menu catering beserta foto. Member & Pengurus wajib memilih satu menu saat mendaftar.
            </p>

            {/* Existing items */}
            {menuItems.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {menuItems.map((item) => (
                  <div key={item.id} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border-gold)' }}>
                    {item.imagePreview && (
                      <img src={item.imagePreview} alt={item.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
                    )}
                    <div style={{ padding: '8px', background: 'var(--color-bg-card)', fontSize: '0.82rem', fontWeight: 600 }}>
                      {item.name}
                      {item.price != null && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 500, marginTop: '2px' }}>
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.price)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMenuItem(item.id)}
                      style={{
                        position: 'absolute', top: '6px', right: '6px',
                        width: '24px', height: '24px',
                        borderRadius: '50%', background: 'rgba(0,0,0,0.7)',
                        border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px',
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new menu item */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '16px', border: '1px dashed var(--color-border)' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-light)', marginBottom: '12px' }}>
                + Tambah Menu Baru
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  className="form-input"
                  type="text"
                  value={newMenu.name}
                  onChange={(e) => setNewMenu((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nama menu, contoh: Nasi Goreng Spesial"
                  id="new-menu-name"
                />
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  value={newMenu.price}
                  onChange={(e) => {
                    // only allow digits
                    const raw = e.target.value.replace(/\D/g, '')
                    setNewMenu((p) => ({ ...p, price: raw }))
                  }}
                  placeholder="Harga (Rp) — kosongkan jika gratis"
                  id="new-menu-price"
                />

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {newMenu.imagePreview ? (
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={newMenu.imagePreview}
                        alt="preview"
                        style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border-gold)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setNewMenu((p) => ({ ...p, imageFile: null, imagePreview: null }))}
                        style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-error)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                      <input type="file" accept="image/*" onChange={handleMenuImage} style={{ display: 'none' }} id="menu-photo-upload" />
                      <div style={{
                        width: '80px', height: '60px', borderRadius: '8px',
                        border: '2px dashed var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.02)',
                      }}>📷</div>
                    </label>
                  )}
                  <button type="button" className="btn btn-dark btn-sm" onClick={addMenuItem} id="add-menu-btn">
                    Tambahkan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            id="create-event-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? <><div className="spinner" /> Membuat Event...</> : '✅ Buat Event'}
          </button>
        </form>
      </main>
    </div>
  )
}
