import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { uploadBuktiSG } from '../lib/storage'
import { JURUSAN_OPTIONS } from '../lib/utils'
import CateringPicker from '../components/forms/CateringPicker'
import ImageUpload from '../components/ui/ImageUpload'
import sreLogoWhite from '../assets/sre-logo-white.png'

const ANGKATAN_OPTIONS = ['2020', '2021', '2022', '2023', '2024', '2025']

export default function RegisterPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    jenis: '',
    nama: '',
    nim: '',
    jurusan: '',
    angkatan: '',
    jabatan: '',
    alasan_tidak_hadir: '',
    catering_choice: '',
  })
  const [buktiFile, setBuktiFile] = useState(null)

  // Load event data from sessionStorage or fetch from DB
  useEffect(() => {
    const cached = sessionStorage.getItem('sre_event')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.event_id === eventId) {
          setEventData(parsed)
          return
        }
      } catch (_) {}
    }
    // Fetch directly if no cache
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, nama_acara, tanggal_acara, catering_options')
        .eq('id', eventId)
        .single()
      if (error || !data) {
        toast.error('Acara tidak ditemukan')
        navigate('/')
        return
      }
      setEventData({
        event_id: data.id,
        nama_acara: data.nama_acara,
        catering_options: data.catering_options,
        tanggal_acara: data.tanggal_acara,
      })
    } catch {
      toast.error('Gagal memuat data acara')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate() {
    const errs = {}
    if (!form.jenis) errs.jenis = 'Pilih jenis pendaftaran'
    if (!form.nama.trim()) errs.nama = 'Nama wajib diisi'
    if (!form.nim.trim()) errs.nim = 'NIM wajib diisi'
    if (!form.jurusan) errs.jurusan = 'Pilih jurusan'

    if (form.jenis === 'member' && !form.angkatan) errs.angkatan = 'Pilih angkatan'
    if (form.jenis === 'pengurus' && !form.jabatan.trim()) errs.jabatan = 'Jabatan wajib diisi'
    if (form.jenis === 'izin' && !form.alasan_tidak_hadir.trim()) errs.alasan = 'Alasan wajib diisi'

    // Member & Pengurus: wajib upload bukti + pilih catering (sesuai DB constraint)
    if (form.jenis === 'member' || form.jenis === 'pengurus') {
      if (!buktiFile) errs.bukti = 'Upload screenshot SG Invitation wajib'
      if (!form.catering_choice) errs.catering = 'Pilih menu catering wajib'
    }

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Lengkapi semua field yang wajib diisi')
      // Scroll to first error
      const firstErrKey = Object.keys(errs)[0]
      document.getElementById(`field-${firstErrKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    try {
      // 1. Generate a temp UUID for file naming
      const tempId = crypto.randomUUID()

      // 2. Upload bukti if needed (Member/Pengurus)
      let buktiUrl = null
      if (buktiFile && (form.jenis === 'member' || form.jenis === 'pengurus')) {
        toast.loading('Mengupload bukti SG Invitation...', { id: 'upload' })
        buktiUrl = await uploadBuktiSG(buktiFile, tempId)
        toast.dismiss('upload')
      }

      // 3. Insert to registrations
      const payload = {
        event_id: eventId,
        jenis: form.jenis,
        nama: form.nama.trim(),
        nim: form.nim.trim(),
        jurusan: form.jurusan,
        angkatan: form.jenis === 'member' ? form.angkatan : null,
        jabatan: form.jenis === 'pengurus' ? form.jabatan.trim() : null,
        alasan_tidak_hadir: form.jenis === 'izin' ? form.alasan_tidak_hadir.trim() : null,
        catering_choice: (form.jenis !== 'izin' && form.catering_choice) ? form.catering_choice : null,
        bukti_url: buktiUrl,
      }

      const { error } = await supabase.from('registrations').insert(payload)
      if (error) throw error

      // 4. Save summary to sessionStorage for SuccessPage
      sessionStorage.setItem('sre_success', JSON.stringify({
        nama: form.nama,
        jenis: form.jenis,
        nama_acara: eventData?.nama_acara,
        catering_choice: form.catering_choice,
        catering_options: eventData?.catering_options,
      }))

      navigate('/success')
    } catch (err) {
      console.error(err)
      toast.error(err?.message || 'Terjadi kesalahan saat submit. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay" style={{ minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
        <p className="text-muted">Memuat data acara...</p>
      </div>
    )
  }

  const cateringOptions = eventData?.catering_options || []
  const isHadir = form.jenis === 'member' || form.jenis === 'pengurus'

  return (
    <div style={{ background: 'var(--color-bg-dark)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <img src={sreLogoWhite} alt="SRE Logo" />
          <div className="navbar-title">Society of<br />Renewable Energy</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          ← Kembali
        </button>
      </nav>

      <div className="page-wrapper">
        <div className="container-sm" style={{ padding: '40px 24px 80px' }}>

          {/* Event Header */}
          {eventData && (
            <div className="animate-in" style={{ marginBottom: '32px', textAlign: 'center' }}>
              <div className="badge badge-gold" style={{ marginBottom: '12px' }}>
                Formulir Pendaftaran
              </div>
              <h1 className="section-title" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', marginBottom: '8px' }}>
                {eventData.nama_acara}
              </h1>
              {eventData.tanggal_acara && (
                <p className="text-muted text-sm">
                  {new Date(eventData.tanggal_acara).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ===================== JENIS PENDAFTARAN ===================== */}
            <div className="card-glass animate-in animate-in-delay-1" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-gold)' }}>
                Jenis Pendaftaran
              </h2>
              <div className="role-grid" id="field-jenis">
                {[
                  { value: 'member', icon: '🎓', title: 'Member', desc: 'Anggota SRE aktif' },
                  { value: 'pengurus', icon: '⚙️', title: 'Pengurus', desc: 'Pengurus SRE' },
                  { value: 'izin', icon: '📋', title: 'Izin', desc: 'Tidak dapat hadir' },
                ].map((role) => (
                  <label
                    key={role.value}
                    className={`role-card ${form.jenis === role.value ? 'selected' : ''}`}
                    htmlFor={`role-${role.value}`}
                  >
                    <input
                      type="radio"
                      id={`role-${role.value}`}
                      name="jenis"
                      value={role.value}
                      checked={form.jenis === role.value}
                      onChange={() => {
                        setField('jenis', role.value)
                        // Reset conditional fields
                        setForm((prev) => ({
                          ...prev,
                          jenis: role.value,
                          angkatan: '',
                          jabatan: '',
                          alasan_tidak_hadir: '',
                          catering_choice: '',
                        }))
                        setBuktiFile(null)
                        setErrors({})
                      }}
                    />
                    <span className="role-icon">{role.icon}</span>
                    <div className="role-title">{role.title}</div>
                    <div className="role-desc">{role.desc}</div>
                  </label>
                ))}
              </div>
              {errors.jenis && <p className="form-error" style={{ marginTop: '12px' }}><span>⚠️</span> {errors.jenis}</p>}
            </div>

            {/* ===================== DATA DIRI ===================== */}
            {form.jenis && (
              <div className="card-glass animate-in" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-gold)' }}>
                  Data Diri
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Nama */}
                  <div className="form-group" id="field-nama">
                    <label className="form-label required" htmlFor="input-nama">Nama Lengkap</label>
                    <input
                      id="input-nama"
                      className={`form-input ${errors.nama ? 'error' : ''}`}
                      type="text"
                      value={form.nama}
                      onChange={(e) => setField('nama', e.target.value)}
                      placeholder="Masukkan nama lengkap"
                    />
                    {errors.nama && <p className="form-error"><span>⚠️</span> {errors.nama}</p>}
                  </div>

                  {/* NIM */}
                  <div className="form-group" id="field-nim">
                    <label className="form-label required" htmlFor="input-nim">NIM</label>
                    <input
                      id="input-nim"
                      className={`form-input ${errors.nim ? 'error' : ''}`}
                      type="text"
                      value={form.nim}
                      onChange={(e) => setField('nim', e.target.value)}
                      placeholder="Masukkan NIM"
                    />
                    {errors.nim && <p className="form-error"><span>⚠️</span> {errors.nim}</p>}
                  </div>

                  {/* Jurusan */}
                  <div className="form-group" id="field-jurusan">
                    <label className="form-label required" htmlFor="input-jurusan">Jurusan</label>
                    <select
                      id="input-jurusan"
                      className={`form-select ${errors.jurusan ? 'error' : ''}`}
                      value={form.jurusan}
                      onChange={(e) => setField('jurusan', e.target.value)}
                    >
                      <option value="">Pilih Jurusan</option>
                      {JURUSAN_OPTIONS.map((j) => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                    {errors.jurusan && <p className="form-error"><span>⚠️</span> {errors.jurusan}</p>}
                  </div>

                  {/* Conditional: Angkatan (Member) */}
                  {form.jenis === 'member' && (
                    <div className="form-group animate-in" id="field-angkatan">
                      <label className="form-label required" htmlFor="input-angkatan">Angkatan</label>
                      <select
                        id="input-angkatan"
                        className={`form-select ${errors.angkatan ? 'error' : ''}`}
                        value={form.angkatan}
                        onChange={(e) => setField('angkatan', e.target.value)}
                      >
                        <option value="">Pilih Angkatan</option>
                        {ANGKATAN_OPTIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                      {errors.angkatan && <p className="form-error"><span>⚠️</span> {errors.angkatan}</p>}
                    </div>
                  )}

                  {/* Conditional: Jabatan (Pengurus) */}
                  {form.jenis === 'pengurus' && (
                    <div className="form-group animate-in" id="field-jabatan">
                      <label className="form-label required" htmlFor="input-jabatan">Jabatan</label>
                      <input
                        id="input-jabatan"
                        className={`form-input ${errors.jabatan ? 'error' : ''}`}
                        type="text"
                        value={form.jabatan}
                        onChange={(e) => setField('jabatan', e.target.value)}
                        placeholder="Contoh: Ketua Divisi, Sekretaris..."
                      />
                      {errors.jabatan && <p className="form-error"><span>⚠️</span> {errors.jabatan}</p>}
                    </div>
                  )}

                  {/* Conditional: Alasan Tidak Hadir (Izin) */}
                  {form.jenis === 'izin' && (
                    <div className="form-group animate-in" id="field-alasan">
                      <label className="form-label required" htmlFor="input-alasan">Alasan Tidak Hadir</label>
                      <textarea
                        id="input-alasan"
                        className={`form-textarea ${errors.alasan ? 'error' : ''}`}
                        value={form.alasan_tidak_hadir}
                        onChange={(e) => setField('alasan_tidak_hadir', e.target.value)}
                        placeholder="Jelaskan alasan ketidakhadiran kamu..."
                        rows={4}
                      />
                      {errors.alasan && <p className="form-error"><span>⚠️</span> {errors.alasan}</p>}
                      <div className="alert alert-info" style={{ marginTop: '12px' }}>
                        <span>ℹ️</span>
                        <span>Pendaftar izin tidak perlu memilih catering atau mengupload bukti SG Invitation.</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ===================== BUKTI SG INVITATION (Member & Pengurus) ===================== */}
            {isHadir && (
              <div className="card-glass animate-in" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-gold)' }}>
                  Bukti SG Invitation
                </h2>
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Upload screenshot bukti SG Invitation kamu dari grup WhatsApp/chat resmi SRE.
                </p>
                <div id="field-bukti">
                  <ImageUpload
                    id="bukti-sg-upload"
                    file={buktiFile}
                    onChange={setBuktiFile}
                    error={errors.bukti}
                    hint="PNG, JPG, JPEG (maks. 5MB)"
                  />
                </div>
              </div>
            )}

            {/* ===================== PILIHAN CATERING (Member & Pengurus) ===================== */}
            {isHadir && cateringOptions.length > 0 && (
              <div className="card-glass animate-in" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-gold)' }}>
                  Pilihan Catering <span style={{ color: 'var(--color-gold)', fontSize: '0.85rem' }}>*</span>
                </h2>
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Pilih satu menu catering yang kamu inginkan. Wajib diisi.
                </p>
                <div id="field-catering">
                  <CateringPicker
                    options={cateringOptions}
                    value={form.catering_choice}
                    onChange={(id) => setField('catering_choice', id)}
                    error={errors.catering}
                  />
                </div>
              </div>
            )}

            {/* ===================== SUBMIT ===================== */}
            {form.jenis && (
              <div className="animate-in">
                <button
                  id="submit-registration-btn"
                  type="submit"
                  className="btn btn-primary btn-lg btn-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><div className="spinner" /> Mengirim Data...</>
                  ) : (
                    <>✅ Kirim Pendaftaran</>
                  )}
                </button>
                <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: '12px' }}>
                  Pastikan semua data sudah benar sebelum mengirim.
                </p>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  )
}
