import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import sreLogoWhite from '../../assets/sre-logo-white.png'

export default function AdminSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Berhasil logout')
    navigate('/admin/login')
  }

  const links = [
    { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/admin/events/new', icon: '➕', label: 'Buat Event Baru' },
  ]

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-logo">
        <img src={sreLogoWhite} alt="SRE" />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>RSVP Admin</span>
      </div>

      <ul className="admin-sidebar-nav">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className={location.pathname === link.to ? 'active' : ''}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)' }}>
        <button
          className="btn btn-ghost btn-full btn-sm"
          onClick={handleLogout}
          id="admin-logout-btn"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  )
}
