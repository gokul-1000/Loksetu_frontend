import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, User, Send, Camera, MapPin, Mic, CheckCircle, ChevronRight, AlertCircle, Edit3 } from 'lucide-react'
import { Card, Button, Badge } from '../../components/ui'

const DEPT_SUGGESTIONS = [
  { dept: 'PWD — Engineering Wing', confidence: 92, reason: 'Category: Roads/Infrastructure. Historical routing: 847 similar complaints.', category: 'Roads & Infrastructure', sla: '48 hours' },
  { dept: 'MCD — Local Body',       confidence: 61, reason: 'Possible jurisdiction overlap if road is under MCD maintenance zone.', category: 'Municipal Services', sla: '72 hours' },
  { dept: 'DUSIB',                  confidence: 22, reason: 'Only if complaint involves housing colony internal road.', category: 'Housing Infrastructure', sla: '7 days' },
]

const INITIAL_MSG = { role: 'ai', text: 'Namaste! I\'m your AI complaint assistant. Tell me what civic issue you\'re facing — describe it in your own words, in Hindi or English. I\'ll help you draft the perfect complaint.' }

export default function FileComplaintPage() {
  const navigate   = useNavigate()
  const [tab, setTab]           = useState('ai')        // 'ai' | 'manual'
  const [messages, setMessages] = useState([INITIAL_MSG])
  const [input, setInput]       = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [language, setLanguage] = useState('English')
  const [step, setStep]         = useState('chat')       // 'chat' | 'verify' | 'confirm'
  const [draft, setDraft]       = useState({ title: '', description: '', category: '', location: '', date: '' })
  const [selectedDept, setSelectedDept] = useState(0)
  const [manualForm, setManualForm] = useState({ title: '', description: '', category: 'Roads', location: '' })
  const messagesRef = useRef(null)

  useEffect(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setIsTyping(true)

    // Simulate AI response after short delay
    setTimeout(() => {
      setIsTyping(false)
      const lc = userMsg.toLowerCase()
      let aiText = '', action = null

      if (messages.length === 1) {
        // First real message — extract details
        aiText = `Got it. I've detected this is about a **civic infrastructure issue**. Let me ask a couple of quick things to strengthen your complaint:\n\n📍 Where exactly did this happen? (street, landmark, ward number if you know it)`
      } else if (lc.includes('road') || lc.includes('pothole') || lc.includes('street')) {
        aiText = `I've drafted your complaint. Here's what I've captured:\n\n• **Title:** Pothole / Road damage causing safety hazard\n• **Category:** Roads & Infrastructure\n• **Department:** PWD (recommended)\n\nWhen did this start? I'll add the incident date to strengthen your case.`
      } else if (lc.includes('water') || lc.includes('pipe')) {
        aiText = `Water issues are high priority — you have a 24-hour SLA right. I've drafted:\n\n• **Title:** Water supply disruption\n• **Category:** Water & Sanitation\n• **Department:** Delhi Jal Board (DJB)\n\nHow many households are affected? This affects the urgency score.`
      } else {
        aiText = `Thank you for those details. I've updated your complaint draft. Ready to review it now? I've also suggested the best department to route this to based on 10,000+ similar complaints in Delhi.`
        action = 'show_review'
      }

      setMessages(prev => [...prev, { role: 'ai', text: aiText, action }])

      if (action === 'show_review') {
        setDraft({ title: 'Civic issue — ' + userMsg.slice(0, 40), description: userMsg, category: 'Infrastructure', location: 'Delhi', date: new Date().toISOString().split('T')[0] })
      }
    }, 1200)
  }

  const handleSubmit = () => {
    setTimeout(() => navigate('/citizen/complaints'), 500)
  }

  const CATEGORIES = ['Roads', 'Water & Sanitation', 'Electricity', 'Sanitation', 'Infrastructure', 'Encroachment', 'Environment', 'Parks', 'Noise Pollution', 'Other']

  return (
    <div className="animate-fade-up" style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {['ai', 'manual'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: tab === t ? 600 : 400, background: tab === t ? 'var(--blue)' : 'var(--surface)', color: tab === t ? 'white' : 'var(--ink-light)', border: 'var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--t-fast)' }}>
            {t === 'ai' ? '🤖 AI Assistant' : '📝 Manual Form'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-light)' }}>Language:</span>
          {['English', 'हिंदी', 'ਪੰਜਾਬੀ'].map(l => (
            <button key={l} onClick={() => setLanguage(l)} style={{ padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 11, background: language === l ? 'var(--ink)' : 'var(--canvas)', color: language === l ? 'white' : 'var(--ink-light)', border: 'var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{l}</button>
          ))}
        </div>
      </div>

      {tab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          {/* Chat panel */}
          <Card style={{ display: 'flex', flexDirection: 'column', height: '70vh' }} padding="0">
            <div style={{ padding: '14px 18px', borderBottom: 'var(--border)', background: 'var(--ink)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>LokSetu AI Assistant</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Powered by Gemini · {language}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Online</span>
              </div>
            </div>

            <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.role === 'user' ? 'var(--blue)' : 'var(--canvas-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'var(--border)' }}>
                    {m.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="var(--ink-light)" />}
                  </div>
                  <div style={{ maxWidth: '78%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: m.role === 'user' ? 'var(--blue)' : 'var(--surface)', color: m.role === 'user' ? 'white' : 'var(--ink)', fontSize: 13, lineHeight: 1.6, border: m.role === 'ai' ? 'var(--border)' : 'none', boxShadow: 'var(--shadow-xs)' }}>
                    {m.text}
                    {m.action === 'show_review' && (
                      <button onClick={() => setStep('verify')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '7px 14px', background: 'var(--saffron)', color: 'white', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                        Review & Submit <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--canvas-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border)' }}>
                    <Bot size={14} color="var(--ink-light)" />
                  </div>
                  <div style={{ padding: '12px 16px', background: 'var(--surface)', border: 'var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 150, 300].map(delay => (
                      <div key={delay} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)', animation: `bounce 1s ${delay}ms infinite` }} />
                    ))}
                    <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}`}</style>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 14px', borderTop: 'var(--border)', display: 'flex', gap: 8 }}>
              <button style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', border: 'var(--border)', background: 'var(--canvas)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-light)', flexShrink: 0 }}><Camera size={15} /></button>
              <button style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', border: 'var(--border)', background: 'var(--canvas)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-light)', flexShrink: 0 }}><MapPin size={15} /></button>
              <button style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', border: 'var(--border)', background: 'var(--canvas)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-light)', flexShrink: 0 }}><Mic size={15} /></button>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder={`Describe your issue in ${language}…`} style={{ flex: 1, padding: '8px 14px', border: 'var(--border)', borderRadius: 'var(--r-md)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: 'var(--canvas)' }}
                onFocus={e => e.target.style.borderColor = 'var(--blue-light)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(13,27,42,0.08)'} />
              <button onClick={sendMessage} style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--blue)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={15} color="white" />
              </button>
            </div>
          </Card>

          {/* Right panel: verify step or dept suggestion */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {step === 'chat' && (
              <Card style={{ background: 'var(--ink)', border: 'none' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>How the AI helps</div>
                {[
                  { icon: '🔍', text: 'Extracts title, category, location & date from your description' },
                  { icon: '🏢', text: 'Maps to the right Delhi department from 90+ options' },
                  { icon: '⚡', text: 'Scores urgency 1–10 based on safety, SLA history & sentiment' },
                  { icon: '🌐', text: 'Works in Hindi, Punjabi, English — you choose' },
                  { icon: '📷', text: 'Attach photos and AI describes the issue from the image' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </Card>
            )}

            {step === 'verify' && (
              <>
                <Card>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Draft Review</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[['Title', draft.title || 'Civic infrastructure complaint'], ['Category', draft.category || 'Infrastructure'], ['Location', draft.location || 'Delhi'], ['Date', draft.date]].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 10, color: 'var(--ink-light)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{l}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>AI Dept Recommendation</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-light)', marginBottom: 12 }}>Confirm or change the routing department</div>
                  {DEPT_SUGGESTIONS.map((d, i) => (
                    <div key={i} onClick={() => setSelectedDept(i)} style={{ padding: '10px 12px', borderRadius: 'var(--r-md)', border: `1.5px solid ${selectedDept === i ? 'var(--blue)' : 'rgba(13,27,42,0.08)'}`, background: selectedDept === i ? 'var(--blue-pale)' : 'var(--canvas)', marginBottom: 8, cursor: 'pointer', transition: 'all var(--t-fast)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: selectedDept === i ? 'var(--blue)' : 'var(--ink)' }}>{d.dept}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {selectedDept === i && <CheckCircle size={13} color="var(--blue)" />}
                          <span style={{ fontSize: 11, fontWeight: 700, color: d.confidence > 70 ? 'var(--green)' : d.confidence > 40 ? 'var(--amber)' : 'var(--ink-light)' }}>{d.confidence}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-light)', lineHeight: 1.5, marginBottom: 4 }}>{d.reason}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-light)' }}>SLA: <strong style={{ color: 'var(--ink)' }}>{d.sla}</strong></div>
                    </div>
                  ))}

                  <button onClick={handleSubmit} style={{ width: '100%', padding: '11px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle size={15} /> Confirm & Submit
                  </button>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <Card style={{ maxWidth: 640 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 20 }}>Manual Complaint Form</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Complaint Title', key: 'title', type: 'input', placeholder: 'Brief title describing the issue' },
              { label: 'Location (Street / Landmark / Ward)', key: 'location', type: 'input', placeholder: 'e.g. MG Road near Karol Bagh Metro, Ward 12' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-light)', marginBottom: 6 }}>{label}</div>
                <input value={manualForm[key]} onChange={e => setManualForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={{ width: '100%', padding: '9px 14px', border: 'var(--border)', borderRadius: 'var(--r-md)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', color: 'var(--ink)', background: 'var(--canvas)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-light)'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(13,27,42,0.08)'} />
              </div>
            ))}

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-light)', marginBottom: 6 }}>Category</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setManualForm(f => ({ ...f, category: cat }))} style={{ padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12, background: manualForm.category === cat ? 'var(--blue)' : 'var(--canvas)', color: manualForm.category === cat ? 'white' : 'var(--ink-light)', border: 'var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all var(--t-fast)' }}>{cat}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-light)', marginBottom: 6 }}>Description</div>
              <textarea value={manualForm.description} onChange={e => setManualForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue in detail — when it started, how severe, who is affected…" rows={4} style={{ width: '100%', padding: '9px 14px', border: 'var(--border)', borderRadius: 'var(--r-md)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', color: 'var(--ink)', background: 'var(--canvas)', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = 'var(--blue-light)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(13,27,42,0.08)'} />
            </div>

            <button onClick={handleSubmit} style={{ padding: '11px', background: 'var(--blue)', color: 'white', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Send size={15} /> Submit Complaint
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}