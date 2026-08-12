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
      <main className="admin-main">
        {/* Header */}
        <div className="admin-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/dashboard')} style={{ marginBottom: '16px' }}>
            ← Kembali
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="section-tag">Data Registrasi</div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '4px' }}>
                {event?.nama_acara}
              </h1>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="badge badge-gold">🔑 {event?.kode_unik}</span>
                {event?.tanggal_acara && (
                  <span className="text-muted text-sm">📅 {formatDate(event.tanggal_acara)}</span>
                )}
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleExport} id="export-csv-btn">
              ⬇️ Export CSV ({filtered.length})
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <SummaryCard label="Member" value={summary.member} color="var(--color-success)" />
          <SummaryCard label="Pengurus" value={summary.pengurus} color="var(--color-gold)" />
          <SummaryCard label="Izin" value={summary.izin} color="var(--color-error)" />
          <SummaryCard label="Total" value={registrations.length} color="var(--color-text-white)" />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            className="form-input"
            type="text"
            placeholder="🔍 Cari nama atau NIM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '300px', padding: '10px 14px' }}
            id="search-registrations"
          />
          <select
            className="form-select"
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            style={{ maxWidth: '180px', padding: '10px 40px 10px 14px' }}
            id="filter-jenis"
          >
            <option value="all">Semua Jenis</option>
            <option value="member">Member</option>
            <option value="pengurus">Pengurus</option>
            <option value="izin">Izin</option>
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="card-glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔍</div>
            <p className="text-muted">{registrations.length === 0 ? 'Belum ada pendaftar.' : 'Tidak ada hasil yang cocok.'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nama</th>
                  <th>NIM</th>
                  <th>Jurusan</th>
                  <th>Jenis</th>
                  <th>Detail</th>
                  <th>Catering</th>
                  <th>Bukti SG</th>
                  <th>Tanggal Daftar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-muted text-sm">{i + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-text-white)' }}>{r.nama}</td>
                    <td className="text-sm">{r.nim}</td>
                    <td className="text-sm" style={{ maxWidth: '160px' }}>{r.jurusan}</td>
                    <td>
                      <span className={`badge ${JENIS_BADGE[r.jenis]}`}>
                        {JENIS_LABEL[r.jenis]}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {r.angkatan ? `Angkatan ${r.angkatan}` :
                       r.jabatan ? r.jabatan :
                       r.alasan_tidak_hadir ?
                         <span title={r.alasan_tidak_hadir} style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                           {r.alasan_tidak_hadir.substring(0, 30)}{r.alasan_tidak_hadir.length > 30 ? '...' : ''}
                         </span>
                       : '-'}
                    </td>
                    <td className="text-sm">{getCateringName(r.catering_choice)}</td>
                    <td>
                      {r.bukti_url ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => setSelectedBukti(r.bukti_url)}
                          id={`view-bukti-${r.id}`}
                        >
                          👁️ Lihat
                        </button>
                      ) : (
                        <span className="text-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="text-xs text-muted">
                      {new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Bukti Lightbox */}
      {selectedBukti && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSelectedBukti(null)}
        >
          <button
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer' }}
            onClick={() => setSelectedBukti(null)}
          >✕</button>
          <img
            src={selectedBukti}
            alt="Bukti SG Invitation"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="card-glass" style={{ textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, fontFamily: 'var(--font-serif)' }}>{value}</div>
      <div className="text-muted text-xs">{label}</div>
    </div>
  )
}
