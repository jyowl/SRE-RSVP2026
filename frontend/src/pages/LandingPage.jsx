import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import sreLogoWhite from '../assets/sre-logo-white.png'
import bgGlow from '../assets/bg-glow.png'

export default function LandingPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleValidate(e) {
    e.preventDefault()
    if (!code.trim()) {
      toast.error('Masukkan kode acara terlebih dahulu')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('validate_event_code', {
        input_code: code.trim().toUpperCase(),
      })

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error('Kode acara tidak ditemukan. Periksa kembali kode yang kamu masukkan.')
        return
      }

      const event = data[0]
      sessionStorage.setItem('sre_event', JSON.stringify(event))
      toast.success(`Kode valid! Membuka formulir untuk "${event.nama_acara}"...`)
      setTimeout(() => navigate(`/register/${event.event_id}`), 800)
    } catch (err) {
      console.error(err)
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="hero-section"
      style={{
        backgroundImage: `url(${bgGlow})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div className="hero-grid" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Floating decorative icons */}
      <FloatingIcon icon="🌱" style={{ top: '18%', left: '6%' }} delay="0s" />
      <FloatingIcon icon="⚡" style={{ top: '55%', left: '4%' }} delay="0.5s" />
      <FloatingIcon icon="☀️" style={{ top: '75%', left: '10%' }} delay="1s" />
      <FloatingIcon icon="🔋" style={{ top: '15%', right: '6%' }} delay="0.3s" />
      <FloatingIcon icon="💧" style={{ top: '60%', right: '5%' }} delay="0.8s" />

      {/* Navbar */}
      <nav className="navbar" style={{ width: '100%', position: 'relative', zIndex: 10 }}>
        <div className="navbar-logo">
          <img src={sreLogoWhite} alt="SRE Logo" />
          <div className="navbar-title">
            Society of<br />Renewable Energy
          </div>
        </div>
        <ul className="navbar-links">
          <li><a href="https://comp.sretelu.com/" target="_blank" rel="noreferrer">Website SRE</a></li>
          <li><a href="/admin/login">Admin</a></li>
        </ul>
      </nav>

      {/* Content Outer Wrapper - Bikin Konten di Tengah Layar */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '40px 20px' }}>
        <div className="hero-content animate-in" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          {/* Tag */}
          <div className="badge badge-gold" style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>●</span> SRE RSVP 2026
          </div>

          {/* Title */}
          <h1 className="section-title" style={{ marginBottom: '16px', fontSize: 'clamp(2.2rem, 6vw, 4rem)', textAlign: 'center' }}>
            Daftarkan<br />
            <span className="text-gold">Kehadiranmu</span>
          </h1>

          <p className="section-subtitle" style={{ margin: '0 auto 40px', textAlign: 'center', fontSize: '1.05rem', maxWidth: '520px' }}>
            Masukkan kode unik acara yang kamu dapatkan dari panitia untuk mengakses formulir pendaftaran.
          </p>

          {/* Code Input Form */}
          <form onSubmit={handleValidate} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="event-code-input"
                className="form-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: SRE-2026"
                maxLength={20}
                disabled={loading}
                style={{
                  textAlign: 'center',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  letterSpacing: '0.12em',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  textTransform: 'uppercase',
                  width: '100%'
                }}
                autoFocus
              />
            </div>

            <button
              id="validate-code-btn"
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? (
                <><div className="spinner" /> Memvalidasi...</>
              ) : (
                <>Buka Formulir →</>
              )}
            </button>
          </form>

          <p className="text-muted text-sm" style={{ marginTop: '20px', textAlign: 'center' }}>
            Belum punya kode? Hubungi panitia SRE untuk mendapatkan kode acara.
          </p>
        </div>
      </div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(to top, rgba(6,30,22,0.8), transparent)',
        pointerEvents: 'none',
        zIndex: 5
      }} />
    </div>
  )
}

function FloatingIcon({ icon, style, delay }) {
  return (
    <div style={{
      position: 'absolute',
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      background: 'rgba(27,58,46,0.7)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(232,184,75,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      animation: `float 6s ease-in-out infinite`,
      animationDelay: delay,
      zIndex: 2,
      ...style,
      ['--float-delay']: delay,
    }}>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
      {icon}
    </div>
  )
}