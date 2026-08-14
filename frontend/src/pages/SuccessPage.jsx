import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import sreLogoWhite from '../assets/sre-logo-white.png'
import bgGlow from '../assets/bg-glow.png' // Import background gambar baru

const JENIS_LABEL = {
  member: 'Member',
  pengurus: 'Pengurus',
  izin: 'Izin Tidak Hadir',
}

export default function SuccessPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('sre_success')
    if (raw) {
      try {
        setData(JSON.parse(raw))
        sessionStorage.removeItem('sre_success')
        sessionStorage.removeItem('sre_event')
      } catch (_) {}
    }
  }, [])

  const cateringName = data?.catering_options?.find(c => c.id === data?.catering_choice)?.name

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#061e16',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Image Container dengan Efek Blur */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${bgGlow})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(6px)', // Efek blur halus
          transform: 'scale(1.03)', // Mencegah pinggiran putih akibat blur
          zIndex: 0
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '480px', width: '100%' }}>

        {/* Logo */}
        <img src={sreLogoWhite} alt="SRE" style={{ height: '40px', margin: '0 auto 32px' }} />

        {/* Success Icon */}
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: 'rgba(81, 207, 102, 0.15)',
          border: '2px solid rgba(81,207,102,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          margin: '0 auto 24px',
          animation: 'fadeInUp 0.5s ease both',
        }}>
          ✅
        </div>

        <h1 className="section-title animate-in" style={{ fontSize: '2rem', marginBottom: '12px' }}>
          Pendaftaran Berhasil!
        </h1>
        <p className="text-light animate-in animate-in-delay-1" style={{ marginBottom: '32px', lineHeight: 1.7 }}>
          {data?.nama ? `Terima kasih, ${data.nama}! ` : ''}
          Data pendaftaranmu untuk <strong style={{ color: 'var(--color-gold)' }}>
            {data?.nama_acara || 'acara SRE'}
          </strong> telah berhasil dikirim.
        </p>

        {/* Summary Card */}
        {data && (
          <div className="card-glass animate-in animate-in-delay-2" style={{ textAlign: 'left', marginBottom: '24px' }}>
            <h3 style={{ color: 'var(--color-gold)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
              Ringkasan Pendaftaran
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <SummaryRow label="Nama" value={data.nama} />
              <SummaryRow label="Acara" value={data.nama_acara} />
              <SummaryRow label="Status" value={
                <span className={`badge ${data.jenis === 'izin' ? 'badge-red' : 'badge-green'}`}>
                  {JENIS_LABEL[data.jenis]}
                </span>
              } />
              {cateringName && <SummaryRow label="Catering" value={cateringName} />}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/')}
            id="back-to-home-btn"
          >
            ← Kembali ke Halaman Utama
          </button>
        </div>

        <p className="text-muted text-sm" style={{ marginTop: '24px' }}>
          Simpan halaman ini sebagai bukti pendaftaranmu.
        </p>
      </div>
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