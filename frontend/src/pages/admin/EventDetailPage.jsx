import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { exportToCSV, formatDate } from '../../lib/utils'
import AdminSidebar from '../../components/layout/AdminSidebar'

const JENIS_LABEL = { member: 'Member', pengurus: 'Pengurus', izin: 'Izin' }
const JENIS_BADGE = { member: 'badge-green', pengurus: 'badge-gold', izin: 'badge-red' }

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('all')
  const [selectedBukti, setSelectedBukti] = useState(null) // for lightbox

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    try {
      const [evRes, regRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('registrations').select('*').eq('event_id', id).order('created_at', { ascending: false }),
      ])
      if (evRes.error) throw evRes.error
      if (regRes.error) throw regRes.error
      setEvent(evRes.data)
      setRegistrations(regRes.data || [])
    } catch (err) {
      toast.error('Gagal memuat data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Filtered list
  const filtered = registrations.filter((r) => {
    const matchSearch =
      r.nama?.toLowerCase().includes(search.toLowerCase()) ||
      r.nim?.toLowerCase().includes(search.toLowerCase())
    const matchJenis = filterJenis === 'all' || r.jenis === filterJenis
    return matchSearch && matchJenis
  })

  // Summary counts
  const summary = {
    member: registrations.filter(r => r.jenis === 'member').length,
    pengurus: registrations.filter(r => r.jenis === 'pengurus').length,
    izin: registrations.filter(r => r.jenis === 'izin').length,
  }

  // Get catering name
  function getCateringName(choice) {
    if (!choice || !event?.catering_options) return '-'
    const opt = event.catering_options.find(c => c.id === choice)
    return opt?.name || choice
  }

  function handleExport() {
    if (filtered.length === 0) {
      toast.error('Tidak ada data untuk diexport')
      return
    }
    const rows = filtered.map((r) => ({
      Nama: r.nama,
      NIM: r.nim,
      Jurusan: r.jurusan,
      Jenis: JENIS_LABEL[r.jenis],
      Angkatan: r.angkatan || '-',
      Jabatan: r.jabatan || '-',
      Catering: getCateringName(r.catering_choice),
      'Alasan Izin': r.alasan_tidak_hadir || '-',
      'Bukti SG': r.bukti_url || '-',
      'Tanggal Daftar': new Date(r.created_at).toLocaleString('id-ID'),
    }))
    exportToCSV(rows, `registrasi-${event?.kode_unik || id}.csv`)
    toast.success(`${rows.length} data diexport`)
  }

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main">
          <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
        </main>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main" style={{ padding: '28px 32px' }}>
        {/* Header Section */}
        <div className="admin-header" style={{ marginBottom: '28px' }}>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => navigate('/admin/dashboard')} 
            style={{ 
              marginBottom: '20px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              opacity: 0.85,
              transition: 'all 0.2s'
            }}
          >
            ← Kembali ke Dashboard
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div className="section-tag" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem', fontWeight: 600, color: '#10b981', marginBottom: '4px' }}>
                DATA REGISTRASI
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 700, margin: '4px 0 10px 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
                {event?.nama_acara}
              </h1>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', fontSize: '0.8rem', borderRadius: '20px' }}>
                  🔑 {event?.kode_unik}
                </span>
                {event?.tanggal_acara && (
                  <span className="text-muted text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    📅 {formatDate(event.tanggal_acara)}
                  </span>
                )}
              </div>
            </div>
            
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleExport} 
              id="export-csv-btn"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 18px', 
                fontWeight: 600,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
              }}
            >
              📥 Export CSV ({filtered.length})
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <SummaryCard label="Member" value={summary.member} color="#34d399" icon="👤" />
          <SummaryCard label="Pengurus" value={summary.pengurus} color="#fbbf24" icon="⭐" />
          <SummaryCard label="Izin" value={summary.izin} color="#f87171" icon="✉️" />
          <SummaryCard label="Total Pendaftar" value={registrations.length} color="#ffffff" icon="📊" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', maxWidth: '320px' }}>
            <input
              className="form-input"
              type="text"
              placeholder="Cari nama atau NIM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px 14px 10px 38px', 
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
              id="search-registrations"
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}>
              🔍
            </span>
          </div>

          <select
            className="form-select"
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            style={{ 
              maxWidth: '180px', 
              padding: '10px 36px 10px 14px', 
              borderRadius: '8px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
            id="filter-jenis"
          >
            <option value="all">Semua Jenis</option>
            <option value="member">Member</option>
            <option value="pengurus">Pengurus</option>
            <option value="izin">Izin</option>
          </select>
        </div>

        {/* Table / Empty State */}
        {filtered.length === 0 ? (
          <div className="card-glass" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.7 }}>🔍</div>
            <p className="text-muted" style={{ fontSize: '1rem' }}>
              {registrations.length === 0 ? 'Belum ada pendaftar pada acara ini.' : 'Tidak ada hasil yang cocok dengan pencarian Anda.'}
            </p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>#</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Nama</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>NIM</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Jurusan</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Jenis</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Detail</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Catering</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Bukti SG</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.6)' }}>Tanggal Daftar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr 
                    key={r.id} 
                    style={{ 
                      transition: 'background 0.2s',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <td className="text-muted text-sm" style={{ padding: '12px 16px' }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#ffffff' }}>{r.nama}</td>
                    <td className="text-sm" style={{ padding: '12px 16px', opacity: 0.85 }}>{r.nim}</td>
                    <td className="text-sm" style={{ padding: '12px 16px', maxWidth: '160px', opacity: 0.85 }}>{r.jurusan}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${JENIS_BADGE[r.jenis]}`} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {JENIS_LABEL[r.jenis]}
                      </span>
                    </td>
                    <td className="text-sm text-muted" style={{ padding: '12px 16px' }}>
                      {r.angkatan ? `Angkatan ${r.angkatan}` :
                       r.jabatan ? r.jabatan :
                       r.alasan_tidak_hadir ?
                         <span title={r.alasan_tidak_hadir} style={{ cursor: 'help', textDecoration: 'underline dotted', opacity: 0.9 }}>
                           {r.alasan_tidak_hadir.substring(0, 30)}{r.alasan_tidak_hadir.length > 30 ? '...' : ''}
                         </span>
                       : '-'}
                    </td>
                    <td className="text-sm" style={{ padding: '12px 16px', opacity: 0.85 }}>{getCateringName(r.catering_choice)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {r.bukti_url ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '4px 10px', 
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => setSelectedBukti(r.bukti_url)}
                          id={`view-bukti-${r.id}`}
                        >
                          👁️ Lihat
                        </button>
                      ) : (
                        <span className="text-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="text-xs text-muted" style={{ padding: '12px 16px' }}>
                      {new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {selectedBukti && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setSelectedBukti(null)}
        >
          <button
            style={{ 
              position: 'absolute', top: '20px', right: '20px', 
              background: 'rgba(255,255,255,0.15)', border: 'none', 
              color: 'white', width: '40px', height: '40px', 
              borderRadius: '50%', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onClick={() => setSelectedBukti(null)}
          >✕</button>
          <img
            src={selectedBukti}
            alt="Bukti SG Invitation"
            style={{ 
              maxWidth: '90vw', 
              maxHeight: '85vh', 
              borderRadius: '12px', 
              objectFit: 'contain',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color, icon }) {
  return (
    <div 
      className="card-glass" 
      style={{ 
        padding: '18px 16px', 
        borderRadius: '12px', 
        display: 'flex', 
        flexDirection: 'column', 
        justify: 'space-between',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        transition: 'transform 0.2s, border-color 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span className="text-muted text-xs" style={{ fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
        <span style={{ fontSize: '1rem', opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, color, fontFamily: 'var(--font-serif)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}