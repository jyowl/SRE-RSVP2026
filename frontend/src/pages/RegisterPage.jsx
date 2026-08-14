import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { uploadBuktiPerizinan, uploadBuktiBayar } from '../lib/storage'
import { FAKULTAS_OPTIONS } from '../lib/utils'
import CateringPicker from '../components/forms/CateringPicker'
import ImageUpload from '../components/ui/ImageUpload'
import Modal from '../components/ui/Modal'
import sreLogoWhite from '../assets/sre-logo-white.png'
import bgGlow from '../assets/bg-land.jpg'

const ROLE_META = {
  member: { icon: '🎓', title: 'Member', desc: 'Anggota SRE aktif' },
  pengurus: { icon: '⚙️', title: 'Pengurus', desc: 'Pengurus SRE' },
  izin: { icon: '📋', title: 'Izin', desc: 'Tidak dapat hadir' },
}

const JENIS_LABEL = { member: 'Member', pengurus: 'Pengurus', izin: 'Perizinan Berhasil' }

const ANGKATAN_OPTIONS = ['2020', '2021', '2022', '2023', '2024', '2025']

export default function RegisterPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()

  const [eventData, setEventData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [successData, setSuccessData] = useState(null)

  const [form, setForm] = useState({
    jenis: '',
    nama: '',
    nim: '',
    fakultas: '',
    jurusan: '',
    angkatan: '',
    jabatan: '',
    alasan_tidak_hadir: '',
    catering_choices: [],     // array of selected menu IDs
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
        .select('id, nama_acara, deskripsi, tanggal_acara, jam_acara, tempat, catering_options, qris_url')
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
        tempat: data.tempat || null,
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
      nama: form.nama,
      nim: form.nim,
      fakultas: form.fakultas,
      jurusan: form.jurusan,
      angkatan: '',
      jabatan: newJenis === 'member' ? 'Member' : '',
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
    if (!form.fakultas) errs.fakultas = 'Pilih fakultas'
    if (!form.jurusan.trim()) errs.jurusan = 'Jurusan wajib diisi'
    if (!form.angkatan) errs.angkatan = 'Pilih angkatan'
    if (form.jenis !== 'member' && !form.jabatan.trim()) errs.jabatan = 'Jabatan wajib diisi'

    // Validasi jenis=izin (check_izin_lengkap)
    if (form.jenis === 'izin') {
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
        nama: form.nama.trim(),
        nim: form.nim.trim(),
        fakultas: form.fakultas,
        jurusan: form.jurusan.trim(),
        angkatan: form.angkatan,
        jabatan: form.jenis === 'member' ? 'Member' : form.jabatan.trim(),
        alasan_tidak_hadir: form.jenis === 'izin' ? form.alasan_tidak_hadir.trim() : null,
        bukti_perizinan_url: buktiPerizinanUrl,
        catering_choices: cateringChoicesPayload,
        total_harga: (form.jenis !== 'izin' && totalPrice != null) ? totalPrice : null,
        bukti_bayar_url: buktiBayarUrl,
      }

      const { error } = await supabase.from('registrations').insert(payload)
      if (error) throw error

      setSuccessData({
        nama: form.nama,
        jenis: form.jenis,
        nama_acara: eventData?.nama_acara,
        catering_choices: cateringChoicesPayload,
        total_harga: (form.jenis !== 'izin' && totalPrice != null) ? totalPrice : null,
      })
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

      {/* Dark overlay untuk kontras di atas background terang */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(13,31,26,0.82) 0%, rgba(13,31,26,0.78) 50%, rgba(13,31,26,0.88) 100%)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* Floating back button */}
      <button
        className="btn btn-ghost"
        onClick={() => navigate('/')}
        style={{
          position: 'fixed',
          top: '24px',
          left: '24px',
          zIndex: 50,
          background: 'rgba(13, 31, 26, 0.7)',
          backdropFilter: 'blur(12px)',
          padding: '14px 26px',
          fontSize: '1rem',
        }}
      >
        ← Kembali
      </button>

      <div className="page-wrapper" style={{ position: 'relative', zIndex: 10, paddingTop: '104px' }}>
        <div className="container-sm" style={{ padding: '16px 24px 80px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={sreLogoWhite} alt="SRE Logo" style={{ height: '44px', margin: '0 auto' }} />
          </div>

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
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '1.05rem',
                  marginBottom: '8px',
                  maxWidth: '520px',
                  margin: '0 auto 8px',
                  lineHeight: 1.6
                }}>
                  {eventData.deskripsi}
                </p>
              )}
              {(eventData.tanggal_acara || eventData.jam_acara || eventData.tempat) && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px 14px',
                  marginTop: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.92)',
                }}>
                  {eventData.tanggal_acara && (
                    <span>📅 {new Date(eventData.tanggal_acara).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  )}
                  {eventData.jam_acara && (
                    <span>🕐 {formatJam(eventData.jam_acara)} WIB</span>
                  )}
                  {eventData.tempat && (
                    <span>📍 {eventData.tempat}</span>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ===================== JENIS PENDAFTARAN ===================== */}
            <div className="card-glass animate-in animate-in-delay-1" style={{ marginBottom: '24px' }}>
              {form.jenis ? (
                <SelectedRoleSummary
                  role={{ value: form.jenis, ...ROLE_META[form.jenis] }}
                  onChangeRole={() => resetForm('')}
                />
              ) : (
                <>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-gold)' }}>
                    Jenis Pendaftaran
                  </h2>
                  <div className="role-grid" id="field-jenis">
                    {Object.entries(ROLE_META).map(([value, role]) => (
                      <label
                        key={value}
                        className={`role-card ${form.jenis === value ? 'selected' : ''}`}
                        htmlFor={`role-${value}`}
                      >
                        <input
                          type="radio"
                          id={`role-${value}`}
                          name="jenis"
                          value={value}
                          checked={form.jenis === value}
                          onChange={() => resetForm(value)}
                        />
                        <span className="role-icon">{role.icon}</span>
                        <div className="role-title">{role.title}</div>
                        <div className="role-desc">{role.desc}</div>
                      </label>
                    ))}
                  </div>
                  {errors.jenis && <p className="form-error" style={{ marginTop: '12px' }}><span>⚠️</span> {errors.jenis}</p>}
                </>
              )}
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
                      placeholder="Contoh: Budi Santoso"
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
                      placeholder="Contoh: 1301213045"
                    />
                    {errors.nim && <p className="form-error"><span>⚠️</span> {errors.nim}</p>}
                  </div>

                  {/* Fakultas */}
                  <div className="form-group" id="field-fakultas">
                    <label className="form-label required" htmlFor="input-fakultas">Fakultas</label>
                    <select
                      id="input-fakultas"
                      className={`form-select ${errors.fakultas ? 'error' : ''}`}
                      value={form.fakultas}
                      onChange={(e) => setField('fakultas', e.target.value)}
                    >
                      <option value="">Pilih Fakultas</option>
                      {FAKULTAS_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    {errors.fakultas && <p className="form-error"><span>⚠️</span> {errors.fakultas}</p>}
                  </div>

                  {/* Jurusan */}
                  <div className="form-group" id="field-jurusan">
                    <label className="form-label required" htmlFor="input-jurusan">Jurusan</label>
                    <input
                      id="input-jurusan"
                      className={`form-input ${errors.jurusan ? 'error' : ''}`}
                      type="text"
                      value={form.jurusan}
                      onChange={(e) => setField('jurusan', e.target.value)}
                      placeholder="Contoh: Teknik Informatika"
                    />
                    {errors.jurusan && <p className="form-error"><span>⚠️</span> {errors.jurusan}</p>}
                  </div>

                  {/* Angkatan — wajib untuk semua jenis */}
                  <div className="form-group" id="field-angkatan">
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

                  {/* Jabatan — otomatis "Member" & terkunci kalau jenis=member,
                      diisi manual untuk pengurus & izin */}
                  <div className="form-group" id="field-jabatan">
                    <label className="form-label required" htmlFor="input-jabatan">Jabatan</label>
                    <input
                      id="input-jabatan"
                      className={`form-input ${errors.jabatan ? 'error' : ''}`}
                      type="text"
                      value={form.jabatan}
                      disabled={form.jenis === 'member'}
                      onChange={(e) => setField('jabatan', e.target.value)}
                      placeholder="Contoh: Ketua Divisi, Sekretaris..."
                      style={form.jenis === 'member' ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                    />
                    {errors.jabatan && <p className="form-error"><span>⚠️</span> {errors.jabatan}</p>}
                  </div>

                  {/* Alasan Tidak Hadir — khusus jenis=izin */}
                  {isIzin && (
                    <div className="form-group animate-in" id="field-alasan">
                      <label className="form-label required" htmlFor="input-alasan">Alasan Tidak Hadir</label>
                      <textarea
                        id="input-alasan"
                        className={`form-textarea ${errors.alasan ? 'error' : ''}`}
                        value={form.alasan_tidak_hadir}
                        onChange={(e) => setField('alasan_tidak_hadir', e.target.value)}
                        placeholder="Contoh: Sedang UAS pada tanggal yang sama, tidak bisa hadir."
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
                    label="Bukti Perizinan"
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
                    label="Bukti Pembayaran"
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

      <Modal open={!!successData} onClose={() => navigate('/')} closeOnBackdrop={false}>
        <SuccessModalContent data={successData} onClose={() => { sessionStorage.removeItem('sre_event'); navigate('/') }} />
      </Modal>
    </div>
  )
}

function SuccessModalContent({ data, onClose }) {
  if (!data) return null
  const menuNames = (data.catering_choices || []).map((c) => c.name).filter(Boolean)

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        background: 'rgba(81, 207, 102, 0.15)',
        border: '2px solid rgba(81,207,102,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.2rem',
        margin: '0 auto 20px',
      }}>
        ✅
      </div>

      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '10px' }}>
        Pendaftaran Berhasil!
      </h2>
      <p className="text-light text-sm" style={{ marginBottom: '24px', lineHeight: 1.7 }}>
        {data.nama ? `Terima kasih, ${data.nama}! ` : ''}
        Data pendaftaranmu untuk <strong style={{ color: 'var(--color-gold)' }}>{data.nama_acara}</strong> telah berhasil dikirim.
      </p>

      <div className="card" style={{ textAlign: 'left', marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SummaryRow label="Nama" value={data.nama} />
          <SummaryRow label="Status" value={
            <span className={`badge ${data.jenis === 'izin' ? 'badge-red' : 'badge-green'}`}>
              {JENIS_LABEL[data.jenis]}
            </span>
          } />
          {menuNames.length > 0 && (
            <SummaryRow label="Menu" value={menuNames.join(', ')} />
          )}
          {data.total_harga != null && (
            <SummaryRow
              label="Total"
              value={data.total_harga === 0
                ? 'Gratis'
                : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.total_harga)}
            />
          )}
        </div>
      </div>

      <button className="btn btn-primary btn-lg btn-full" onClick={onClose} id="success-modal-close-btn">
        ← Kembali ke Halaman Utama
      </button>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <span className="text-muted text-sm" style={{ flexShrink: 0 }}>{label}</span>
      <div className="divider" style={{ flex: 1, height: '1px', margin: '0 8px' }} />
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-light)', textAlign: 'right' }}>
        {value || '-'}
      </span>
    </div>
  )
}

function SelectedRoleSummary({ role, onChangeRole }) {
  if (!role) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(232,184,75,0.1)',
          border: '1px solid rgba(232,184,75,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.3rem',
          flexShrink: 0,
        }}>
          {role.icon}
        </span>
        <div>
          <div className="text-muted text-xs" style={{ marginBottom: '2px' }}>Jenis Pendaftaran</div>
          <div style={{ fontWeight: 700, color: 'var(--color-text-white)' }}>{role.title}</div>
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onChangeRole}>
        Ubah
      </button>
    </div>
  )
}