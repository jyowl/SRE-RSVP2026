import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// Public Pages
import LandingPage from './pages/LandingPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'

// Admin Pages
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import NewEventPage from './pages/admin/NewEventPage'
import EventDetailPage from './pages/admin/EventDetailPage'

// Protected Route
function ProtectedRoute({ children, user }) {
  if (user === undefined) {
    // still loading auth state
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }
  if (!user) return <Navigate to="/admin/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#13281f',
            color: '#fff',
            border: '1px solid rgba(232,184,75,0.3)',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#e8b84b', secondary: '#13281f' },
          },
          error: {
            iconTheme: { primary: '#ff6b6b', secondary: '#13281f' },
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register/:eventId" element={<RegisterPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={
          user ? <Navigate to="/admin/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute user={user}><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/admin/events/new" element={
          <ProtectedRoute user={user}><NewEventPage /></ProtectedRoute>
        } />
        <Route path="/admin/events/:id" element={
          <ProtectedRoute user={user}><EventDetailPage /></ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
