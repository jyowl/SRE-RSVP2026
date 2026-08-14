import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { uploadBuktiPerizinan, uploadBuktiBayar } from '../lib/storage'
import { JURUSAN_OPTIONS } from '../lib/utils'
import CateringPicker from '../components/forms/CateringPicker'
import ImageUpload from '../components/ui/ImageUpload'
import sreLogoWhite from '../assets/sre-logo-white.png'
import bgGlow from '../assets/bg-glow.png'

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
    identitas_izin: '',       // NEW: hanya untuk jenis=izin
    nama: '',
    nim: '',
    jurusan: '',
    angkatan: '',
    jabatan: '',
    alasan_tidak_hadir: '',
    catering_choices: [],     // CHANGED: array of selected IDs (was string catering_choice)
  })
  const [buktiPerizinanFile, setBuktiPerizinanFile] = useState(null)  // untuk jenis=izin
  const [buktiBayarFile, setBuktiBayarFile] = useState(null)          // untuk jenis=member/pengurus
  const [totalPrice, setTotalPrice] = useState(null)

  // Load event data from sessionStorage atau fetch dari DB
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
    fetchEvent()
  }, [eventId])

  async function fetchEvent() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, nama_acara, deskripsi, tanggal_acara, jam_acara, catering_options, qris_url')
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
        deskripsi: data.deskripsi || null,
        catering_options: data.catering_options,
        tanggal_acara: data.tanggal_acara,
        jam_acara: data.jam_acara || null,
        qris_url: data.qris_url || null,
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

  function resetForm(newJenis) {
    setForm({
      jenis: newJenis,
      identitas_izin: '',
      nama: form.nama,
      nim: form.nim,
      jurusan: form.jurusan,
      angkatan: '',
      jabatan: '',
      alasan_tidak_hadir: '',
      catering_choices: [],
    })
    setBuktiPerizinanFile(null)
    setBuktiBayarFile(null)
    setTotalPrice(null)
    setErrors({})
  }

  function validate() {
    const errs = {}
    if (!form.jenis) errs.jenis = 'Pilih jenis pendaftaran'
    if (!form.nama.trim()) errs.nama = 'Nama wajib diisi'
    if (!form.nim.trim()) errs.nim = 'NIM wajib diisi'
    if (!form.jurusan) errs.jurusan = 'Pilih jurusan'

    // Validasi jenis=member
    if (form.jenis === 'member') {
      if (!form.angkatan) errs.angkatan = 'Pilih angkatan'
    }
    // Validasi jenis=pengurus
    if (form.jenis === 'pengurus') {
      if (!form.jabatan.trim()) errs.jabatan = 'Jabatan wajib diisi'
    }

    // Validasi jenis=izin (check_izin_lengkap + check_field_identitas)
    if (form.jenis === 'izin') {
      if (!form.identitas_izin) errs.identitas_izin = 'Pilih identitas kamu (member/pengurus)'
      if (form.identitas_izin === 'member' && !form.angkatan) errs.angkatan = 'Pilih angkatan'
      if (form.identitas_izin === 'pengurus' && !form.jabatan.trim()) errs.jabatan = 'Jabatan wajib diisi'
      if (!form.alasan_tidak_hadir.trim()) errs.alasan = 'Alasan tidak hadir wajib diisi'
      if (!buktiPerizinanFile) errs.buktiPerizinan = 'Upload bukti perizinan wajib'
    }

    // Validasi jenis=member/pengurus (check_hadir_lengkap)
    if (form.jenis === 'member' || form.jenis === 'pengurus') {
      if (form.catering_choices.length === 0) errs.catering = 'Pilih minimal satu menu catering'
      if (totalPrice != null && totalPrice > 0 && !buktiBayarFile) {
        errs.buktiBayar = 'Upload bukti pembayaran wajib'
      }
    }

    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.error('Lengkapi semua field yang wajib diisi')
      const firstErrKey = Object.keys(errs)[0]
      document.getElementById(`field-${firstErrKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setSubmitting(true)
    try {
      const tempId = crypto.randomUUID()

      // Upload bukti perizinan (untuk jenis=izin)
      let buktiPerizinanUrl = null
      if (buktiPerizinanFile && form.jenis === 'izin') {
        toast.loading('Mengupload bukti perizinan...', { id: 'upload-perizinan' })
        buktiPerizinanUrl = await uploadBuktiPerizinan(buktiPerizinanFile, tempId)
        toast.dismiss('upload-perizinan')
      }

      // Upload bukti bayar (untuk jenis=member/pengurus)
      let buktiBayarUrl = null
      if (buktiBayarFile && (form.jenis === 'member' || form.jenis === 'pengurus')) {
        toast.loading('Mengupload bukti pembayaran...', { id: 'upload-bayar' })
        buktiBayarUrl = await uploadBuktiBayar(buktiBayarFile, tempId)
        toast.dismiss('upload-bayar')
      }

      const cateringOptions = eventData?.catering_options || []

      // Build catering_choices sebagai array JSON [{id, name, price}]
      const cateringChoicesPayload = (form.jenis !== 'izin' && form.catering_choices.length > 0)
        ? form.catering_choices.map(id => {
            const opt = cateringOptions.find(o => o.id === id)
            return { id, name: opt?.name || id, price: opt?.price ?? null }
          })
        : null

      const payload = {
        event_id: eventId,
        jenis: form.jenis,
        identitas_izin: form.jenis === 'izin' ? form.identitas_izin : null,
        nama: form.nama.trim(),
        nim: form.nim.trim(),
        jurusan: form.jurusan,
        // angkatan: diisi kalau member, atau izin+identitas_izin=member
        angkatan: (form.jenis === 'member' || (form.jenis === 'izin' && form.identitas_izin === 'member'))
          ? form.angkatan : null,
        // jabatan: diisi kalau pengurus, atau izin+identitas_izin=pengurus
        jabatan: (form.jenis === 'pengurus' || (form.jenis === 'izin' && form.identitas_izin === 'pengurus'))
          ? form.jabatan.trim() : null,
        alasan_tidak_hadir: form.jenis === 'izin' ? form.alasan_tidak_hadir.trim() : null,
        bukti_perizinan_url: buktiPerizinanUrl,
        catering_choices: cateringChoicesPayload,
        total_harga: (form.jenis !== 'izin' && totalPrice != null) ? totalPrice : null,
        bukti_bayar_url: buktiBayarUrl,
      }

      const { error } = await supabase.from('registrations').insert(payload)
      if (error) throw error

      sessionStorage.setItem('sre_success', JSON.stringify({
        nama: form.nama,
        jenis: form.jenis,
        identitas_izin: form.identitas_izin || null,
        nama_acara: eventData?.nama_acara,
        catering_choices: cateringChoicesPayload,
        total_harga: totalPrice,
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
  const isIzin = form.jenis === 'izin'

  function formatJam(jam) {
    if (!jam) return null
    return jam.substring(0, 5) // "HH:MM" from "HH:MM:SS"
  }

  return (
    <div 
      style={{ 
        position: 'relative',
        backgroundColor: '#061e16',
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Background Image dengan Efek Blur */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${bgGlow})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(6px)',
          transform: 'scale(1.03)',
          zIndex: 0
        }}
      />

      {/* Navbar */}
      <nav className="navbar" style={{ position: 'relative', zIndex: 10 }}>
        <div className="navbar-logo">
          <img src={sreLogoWhite} alt="SRE Logo" />
          <div className="navbar-title">Society of<br />Renewable Energy</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
          ← Kembali
        </button>
      </nav>

      <div className="page-wrapper" style={{ position: 'relative', zIndex: 10 }}>
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
              {eventData.deskripsi && (
                <p style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '0.95rem',
                  marginBottom: '8px',
                  maxWidth: '520px',
                  margin: '0 auto 8px',
                  lineHeight: 1.6
                }}>
                  {eventData.deskripsi}
                </p>
              )}
              {(eventData.tanggal_acara || eventData.jam_acara) && (
                <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
                  📅{' '}
                  {eventData.tanggal_acara && new Date(eventData.tanggal_acara).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {eventData.tanggal_acara && eventData.jam_acara && ' · '}
                  {eventData.jam_acara && `🕐 ${formatJam(eventData.jam_acara)} WIB`}
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
                      onChange={() => resetForm(role.value)}
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

                  {/* Identitas Izin — khusus jenis=izin */}
                  {isIzin && (
                    <div className="form-group animate-in" id="field-identitas_izin">
                      <label className="form-label required">Kamu adalah seorang</label>
                      <p className="form-hint" style={{ marginBottom: '12px' }}>
                        Pilih status kamu di SRE untuk melengkapi data perizinan.
                      </p>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {[
                          { value: 'member', icon: '🎓', label: 'Member SRE' },
                          { value: 'pengurus', icon: '⚙️', label: 'Pengurus SRE' },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '12px 18px',
                              borderRadius: '10px',
                              border: `2px solid ${form.identitas_izin === opt.value ? 'var(--color-gold)' : 'var(--color-border)'}`,
                              background: form.identitas_izin === opt.value ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              flex: '1',
                              minWidth: '140px',
                            }}
                          >
                            <input
                              type="radio"
                              name="identitas_izin"
                              value={opt.value}
                              checked={form.identitas_izin === opt.value}
                              onChange={() => {
                                setForm(prev => ({ ...prev, identitas_izin: opt.value, angkatan: '', jabatan: '' }))
                                setErrors(prev => ({ ...prev, identitas_izin: undefined, angkatan: undefined, jabatan: undefined }))
                              }}
                              style={{ display: 'none' }}
                            />
                            <span style={{ fontSize: '1.3rem' }}>{opt.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.label}</span>
                            {form.identitas_izin === opt.value && (
                              <span style={{ marginLeft: 'auto', color: 'var(--color-gold)', fontSize: '1rem' }}>✓</span>
                            )}
                          </label>
                        ))}
                      </div>
                      {errors.identitas_izin && (
                        <p className="form-error" style={{ marginTop: '8px' }}><span>⚠️</span> {errors.identitas_izin}</p>
                      )}
                    </div>
                  )}

                  {/* Angkatan — Member langsung, atau Izin+identitas_izin=member */}
                  {(form.jenis === 'member' || (isIzin && form.identitas_izin === 'member')) && (
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

                  {/* Jabatan — Pengurus langsung, atau Izin+identitas_izin=pengurus */}
                  {(form.jenis === 'pengurus' || (isIzin && form.identitas_izin === 'pengurus')) && (
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

                  {/* Alasan Tidak Hadir — khusus jenis=izin */}
                  {isIzin && (
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
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* ===================== BUKTI PERIZINAN (hanya jenis=izin) ===================== */}
            {isIzin && (
              <div className="card-glass animate-in" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-gold)' }}>
                  📎 Bukti Perizinan
                </h2>
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Upload surat/foto bukti perizinan atau bukti komunikasi dengan PIC acara.
                </p>
                <div id="field-buktiPerizinan">
                  <ImageUpload
                    id="bukti-perizinan-upload"
                    file={buktiPerizinanFile}
                    onChange={setBuktiPerizinanFile}
                    error={errors.buktiPerizinan}
                    hint="PNG, JPG, JPEG (maks. 5MB)"
                  />
                </div>
                <div className="alert alert-info" style={{ marginTop: '12px' }}>
                  <span>ℹ️</span>
                  <span>Pendaftar izin tidak perlu memilih catering atau melakukan pembayaran.</span>
                </div>
              </div>
            )}

            {/* ===================== PILIHAN CATERING (Member & Pengurus) ===================== */}
            {isHadir && cateringOptions.length > 0 && (
              <div className="card-glass animate-in" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-gold)' }}>
                  Pilihan Catering <span style={{ fontSize: '0.85rem' }}>*</span>
                </h2>
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Pilih menu catering yang kamu inginkan. Bisa pilih lebih dari satu.
                </p>
                <div id="field-catering">
                  <CateringPicker
                    options={cateringOptions}
                    value={form.catering_choices}
                    onChange={(ids) => setField('catering_choices', ids)}
                    onPriceChange={(total) => setTotalPrice(total)}
                    error={errors.catering}
                    multiSelect={true}
                  />
                </div>
              </div>
            )}

            {/* ===================== RINGKASAN PEMBAYARAN ===================== */}
            {isHadir && form.catering_choices.length > 0 && totalPrice != null && (
              <div className="card-glass animate-in payment-summary-card" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '16px', color: 'var(--color-gold)' }}>
                  💳 Ringkasan Pembayaran
                </h2>

                {/* Daftar menu yang dipilih */}
                {form.catering_choices.map(id => {
                  const opt = cateringOptions.find(o => o.id === id)
                  return opt ? (
                    <div key={id} className="payment-row">
                      <span className="payment-label">🍽️ {opt.name}</span>
                      <span className="payment-value">
                        {opt.price == null
                          ? '—'
                          : opt.price === 0
                            ? 'Gratis'
                            : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(opt.price)
                        }
                      </span>
                    </div>
                  ) : null
                })}

                <div className="payment-divider" />

                <div className="payment-row payment-total">
                  <span>Total Pembayaran</span>
                  <span className="payment-total-amount">
                    {totalPrice === 0
                      ? 'GRATIS'
                      : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalPrice)
                    }
                  </span>
                </div>

                {/* QR Code pembayaran */}
                {totalPrice > 0 && eventData?.qris_url && (
                  <div className="qr-code-section">
                    <p className="form-hint" style={{ marginBottom: '12px', textAlign: 'center' }}>
                      Scan QR Code di bawah untuk melakukan pembayaran
                    </p>
                    <div className="qr-code-box">
                      <img
                        src={eventData.qris_url}
                        alt="QR Code Pembayaran"
                        className="qr-code-img"
                      />
                    </div>
                    <p className="form-hint" style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.78rem', opacity: 0.7 }}>
                      Simpan bukti transfer setelah pembayaran
                    </p>
                  </div>
                )}

                {totalPrice > 0 && !eventData?.qris_url && (
                  <div className="alert alert-info" style={{ marginTop: '16px' }}>
                    <span>ℹ️</span>
                    <span>QR Code pembayaran belum tersedia. Hubungi panitia untuk info pembayaran.</span>
                  </div>
                )}
              </div>
            )}

            {/* ===================== UPLOAD BUKTI BAYAR (Member & Pengurus, jika ada harga) ===================== */}
            {isHadir && form.catering_choices.length > 0 && totalPrice != null && totalPrice > 0 && (
              <div className="card-glass animate-in" style={{ marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-gold)' }}>
                  📎 Bukti Pembayaran
                </h2>
                <p className="form-hint" style={{ marginBottom: '16px' }}>
                  Upload screenshot atau foto bukti transfer / pembayaran QRIS.
                </p>
                <div id="field-buktiBayar">
                  <ImageUpload
                    id="bukti-bayar-upload"
                    file={buktiBayarFile}
                    onChange={setBuktiBayarFile}
                    error={errors.buktiBayar}
                    hint="PNG, JPG, JPEG (maks. 5MB)"
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