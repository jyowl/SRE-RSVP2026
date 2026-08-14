import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import AdminSidebar from '../../components/layout/AdminSidebar'
import Modal from '../../components/ui/Modal'

export default function DashboardPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({}) // { eventId: count }
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, nama_acara }
  const navigate = useNavigate()

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])

      // Fetch registration counts for each event
      if (data && data.length > 0) {
        const countPromises = data.map((ev) =>
          supabase
            .from('registrations')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', ev.id)
            .then(({ count }) => ({ id: ev.id, count: count || 0 }))
        )
        const results = await Promise.all(countPromises)
        const countMap = {}
        results.forEach(({ id, count }) => { countMap[id] = count })
        setCounts(countMap)
      }
    } catch (err) {
      toast.error('Gagal memuat data event')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const { error } = await supabase.from('events').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Event berhasil dihapus')
      setDeleteTarget(null)
      fetchEvents()
    } catch (err) {
      toast.error('Gagal menghapus event')
    }
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div className="section-tag">Admin Panel</div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '4px' }}>Dashboard</h1>
              <p className="text-muted text-sm">Kelola semua event RSVP SRE 2026</p>
            </div>
            <Link to="/admin/events/new">
              <button className="btn btn-primary" id="create-event-btn">
                ➕ Buat Event Baru
              </button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard icon="📅" label="Total Event" value={events.length} />
          <StatCard
            icon="👥"
            label="Total Pendaftar"
            value={Object.values(counts).reduce((a, b) => a + b, 0)}
          />
        </div>

        {/* Events List */}
        {loading ? (
          <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
        ) : events.length === 0 ? (
          <div className="card-glass" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: '8px' }}>Belum Ada Event</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>Buat event pertama untuk mulai menerima pendaftaran.</p>
            <Link to="/admin/events/new">
              <button className="btn btn-primary">Buat Event Pertama</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                count={counts[ev.id] || 0}
                onView={() => navigate(`/admin/events/${ev.id}`)}
                onDelete={() => setDeleteTarget({ id: ev.id, nama_acara: ev.nama_acara })}
              />
            ))}
          </div>
        )}
      </main>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="400px">
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', marginBottom: '10px' }}>
          Hapus Event?
        </h2>
        <p className="text-light text-sm" style={{ marginBottom: '24px', lineHeight: 1.6 }}>
          Event <strong style={{ color: 'var(--color-gold)' }}>"{deleteTarget?.nama_acara}"</strong> beserta semua data registrasinya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-ghost btn-full" onClick={() => setDeleteTarget(null)}>
            Batal
          </button>
          <button
            className="btn btn-full"
            onClick={handleDelete}
            style={{ background: 'var(--color-error)', color: 'white' }}
          >
            Hapus
          </button>
        </div>
      </Modal>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card-glass" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ fontSize: '2rem' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-serif)', color: 'var(--color-gold)' }}>
          {value}
        </div>
        <div className="text-muted text-sm">{label}</div>
      </div>
    </div>
  )
}

function EventCard({ event, count, onView, onDelete }) {
  const cateringCount = event.catering_options?.length || 0

  function copyCode() {
    navigator.clipboard.writeText(event.kode_unik)
    toast.success(`Kode "${event.kode_unik}" disalin!`)
  }

  return (
    <div className="card-glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ flex: 1, minWidth: '200px' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '6px' }}>{event.nama_acara}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <button
            className="badge badge-gold"
            onClick={copyCode}
            style={{ cursor: 'pointer', letterSpacing: '0.1em' }}
            title="Klik untuk salin kode"
          >
            🔑 {event.kode_unik}
          </button>
          {event.tanggal_acara && (
            <span className="text-muted text-xs">📅 {formatDate(event.tanggal_acara)}</span>
          )}
          <span className="text-muted text-xs">🍽️ {cateringCount} menu</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>{count}</div>
          <div className="text-muted text-xs">Pendaftar</div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-dark btn-sm" onClick={onView} id={`view-event-${event.id}`}>
            Lihat Data →
          </button>
          <button
            className="btn btn-sm"
            onClick={onDelete}
            style={{ background: 'rgba(255,107,107,0.1)', color: 'var(--color-error)', border: '1px solid rgba(255,107,107,0.3)' }}
            id={`delete-event-${event.id}`}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
