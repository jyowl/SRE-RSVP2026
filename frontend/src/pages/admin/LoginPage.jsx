import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import sreLogoWhite from '../../assets/sre-logo-white.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('Email dan password wajib diisi')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      })
      if (error) throw error
      toast.success('Login berhasil! Memuat dashboard...')
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err.message || 'Login gagal. Periksa email dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-dark)',
      padding: '24px',
    }}>
      <div className="hero-bg" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
      <div className="hero-grid" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

      <div className="card-glass animate-in" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={sreLogoWhite} alt="SRE" style={{ height: '36px', margin: '0 auto 12px' }} />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '4px' }}>Admin Panel</h1>
          <p className="text-muted text-sm">SRE RSVP 2026</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label required" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              className="form-input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="admin@sretelu.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label required" htmlFor="admin-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                className="form-input"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="admin-login-btn"
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? <><div className="spinner" /> Masuk...</> : 'Masuk ke Admin Panel'}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0' }} />
        <p className="text-muted text-sm" style={{ textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--color-gold)', textDecoration: 'underline' }}>← Kembali ke halaman utama</a>
        </p>
      </div>
    </div>
  )
}
