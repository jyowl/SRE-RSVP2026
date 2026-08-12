import { useNavigate } from 'react-router-dom'
import sreLogoWhite from '../assets/sre-logo-white.png'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-dark)',
      textAlign: 'center',
      padding: '24px',
    }}>
      <div className="hero-bg" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <img src={sreLogoWhite} alt="SRE" style={{ height: '36px', margin: '0 auto 32px' }} />
        <div style={{ fontSize: '5rem', marginBottom: '16px' }}>🌿</div>
        <h1 className="section-title" style={{ fontSize: '4rem', color: 'var(--color-gold)', marginBottom: '8px' }}>404</h1>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '12px' }}>Halaman tidak ditemukan</h2>
        <p className="text-muted" style={{ marginBottom: '32px' }}>
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')} id="go-home-btn">
          Kembali ke Beranda
        </button>
      </div>
    </div>
  )
}
