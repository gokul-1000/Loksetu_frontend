import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Shield, User, Building2, Crown, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui'

const ROLES = [
  { key: 'citizen',  label: 'Citizen',       icon: User,      color: 'var(--blue)',    desc: 'File complaints & track status',  demo: { email: '', phone: '+919876543210', password: 'demo123' } },
  { key: 'officer',  label: 'Ward Officer',   icon: Shield,    color: 'var(--saffron)', desc: 'Manage your ward\'s queue',        demo: { email: 'officer@demo.com',         password: 'demo123' } },
  { key: 'dept',     label: 'Dept Head',      icon: Building2, color: 'var(--green)',   desc: 'Department analytics & team',     demo: { email: 'dept@demo.com',            password: 'demo123' } },
  { key: 'leader',   label: 'Leader / DC',    icon: Crown,     color: 'var(--purple)',  desc: 'City-level intelligence',          demo: { email: 'admin@demo.com',           password: 'demo123' } },
]

const REDIRECT = { 
  citizen: '/citizen',       // Matches <Route path="/citizen" ...>
  officer: '/officer',       // Matches <Route path="/officer" ...>
  dept:    '/department',    // Matches <Route path="/department" ...>
  leader:  '/leader'         // Matches <Route path="/leader" ...>
}
export default function LoginPage() {
  const navigate       = useNavigate()
  const [params]       = useSearchParams()
  const [role, setRole]= useState(params.get('role') || 'citizen')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const selected = ROLES.find(r => r.key === role) || ROLES[0]
  const Icon     = selected.icon

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Replace with real API call
      await new Promise(r => setTimeout(r, 800))
      navigate(REDIRECT[role])
    } catch {
      setError('Invalid credentials. Use the demo credentials shown below.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail(selected.demo.email || '')
    setPhone(selected.demo.phone || '')
    setPassword(selected.demo.password)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(26,75,140,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
        {/* Back */}
        <button onClick={() => navigate('/')} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 28, transition: 'color var(--t-fast)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
          <ArrowLeft size={14} /> Back to home
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, background: 'var(--saffron)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={18} color="white" /></div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'white' }}>LokSetu</span>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, backdropFilter: 'blur(12px)' }}>
          {/* Role picker */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Sign in as</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {ROLES.map(r => {
                const RIcon = r.icon
                const active = r.key === role
                return (
                  <button key={r.key} onClick={() => { setRole(r.key); setEmail(''); setPhone(''); setPassword(''); setError('') }}
                    style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, border: active ? `1.5px solid ${r.color}` : '1px solid rgba(255,255,255,0.08)', background: active ? 'rgba(255,255,255,0.07)' : 'transparent', transition: 'all var(--t-fast)' }}>
                    <RIcon size={14} color={active ? r.color : 'rgba(255,255,255,0.35)'} />
                    <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'white' : 'rgba(255,255,255,0.45)' }}>{r.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Role description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 20, border: `1px solid ${selected.color}20` }}>
            <Icon size={15} color={selected.color} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{selected.desc}</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {role === 'citizen' ? (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 7 }}>PHONE NUMBER</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" type="tel"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = selected.color} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'} />
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 7 }}>EMAIL ADDRESS</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = selected.color} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'} />
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', marginBottom: 7 }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, padding: '10px 40px 10px 14px', color: 'white', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = selected.color} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.10)'} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-pale)', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>{error}</div>}

            <Button type="submit" size="lg" disabled={loading} style={{ width: '100%', justifyContent: 'center', background: selected.color, fontSize: 14 }}>
              {loading ? 'Signing in…' : `Sign in as ${selected.label}`}
            </Button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 18, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', marginBottom: 7 }}>DEMO CREDENTIALS</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)', lineHeight: 1.8 }}>
              {role === 'citizen' ? `Phone: +919876543210` : `Email: ${selected.demo.email}`}<br />
              Password: demo123
            </div>
            <button onClick={fillDemo} style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: selected.color, fontWeight: 600, marginTop: 7 }}>
              Fill demo credentials →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
