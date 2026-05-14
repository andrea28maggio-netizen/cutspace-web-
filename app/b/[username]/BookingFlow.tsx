'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { AvailDay, BookedSlot } from './page'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const BG     = '#1E2432'
const CARD   = '#252D3D'
const GOLD   = '#C9A85C'
const MUTED  = 'rgba(255,255,255,0.45)'
const BORDER = 'rgba(255,255,255,0.08)'

type Service = {
  id: string
  name: string
  duration_minutes: number
  price_aud: number
}

type Step = 'select-service' | 'select-slot' | 'details' | 'confirm' | 'done'

// Generate 'HH:MM' slot start times between startTime and endTime with durationMins step.
// A slot is valid only if it finishes by endTime.
function generateDaySlots(startTime: string, endTime: string, durationMins: number): string[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins   = eh * 60 + em
  const slots: string[] = []
  for (let t = startMins; t + durationMins <= endMins; t += durationMins) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

// Convert 'HH:MM' (24h) to '9:00 AM' for display
function fmtSlotTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const h12    = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export default function BookingFlow({
  barberId,
  services,
  availabilityDays,
  bookedSlots,
}: {
  barberId: string
  services: Service[]
  availabilityDays: AvailDay[]
  bookedSlots: BookedSlot[]
}) {
  const [step,          setStep]         = useState<Step>('select-service')
  const [selService,    setSelService]   = useState<Service | null>(null)
  const [selDate,       setSelDate]      = useState('')
  const [selDateLabel,  setSelDateLabel] = useState('')
  const [selTime,       setSelTime]      = useState('')   // 'HH:MM' 24h
  const [name,          setName]         = useState('')
  const [email,         setEmail]        = useState('')
  const [phone,         setPhone]        = useState('')
  const [notes,         setNotes]        = useState('')
  const [submitting,    setSubmitting]   = useState(false)
  const [error,         setError]        = useState('')

  // Pre-build a Set for O(1) booked-slot lookup
  const bookedSet = useMemo(
    () => new Set(bookedSlots.map(b => `${b.slot_date}|${b.slot_time}`)),
    [bookedSlots],
  )

  // For the currently selected service, compute available slots per day
  const daysWithSlots = useMemo(() => {
    if (!selService) return []
    return availabilityDays
      .map(day => ({
        ...day,
        slots: generateDaySlots(day.startTime, day.endTime, selService.duration_minutes)
          .filter(t => !bookedSet.has(`${day.date}|${t}`)),
      }))
      .filter(day => day.slots.length > 0)
  }, [selService, availabilityDays, bookedSet])

  function selectService(svc: Service) {
    setSelService(svc)
    setStep('select-slot')
  }

  function selectSlot(date: string, label: string, time: string) {
    setSelDate(date)
    setSelDateLabel(label)
    setSelTime(time)
    setStep('details')
  }

  async function submitBooking() {
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }
    if (!/\S+@\S+\.\S+/.test(email))  { setError('Enter a valid email address.'); return }
    setError(''); setSubmitting(true)

    const { error: dbError } = await supabase.from('client_bookings').insert({
      barber_id:    barberId,
      service_id:   selService!.id,
      client_name:  name.trim(),
      client_email: email.trim(),
      client_phone: phone.trim() || null,
      slot_date:    selDate,
      slot_time:    selTime,   // already 'HH:MM' 24h
      notes:        notes.trim() || null,
    })

    setSubmitting(false)
    if (dbError) { setError(dbError.message); return }
    setStep('done')
  }

  // ── Done ─────────────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div style={{ background: CARD, borderRadius: 16, padding: 32, border: `1px solid ${BORDER}`, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Booking Confirmed!</h2>
        <p style={{ color: MUTED, fontSize: 14, margin: '0 0 20px' }}>
          {selService?.name} · {selDateLabel} at {fmtSlotTime(selTime)}
        </p>
        <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
          A confirmation has been sent to {email}
        </p>
      </div>
    )
  }

  // ── Select service ────────────────────────────────────────────────────────────

  if (step === 'select-service') {
    if (services.length === 0) return null
    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Select a Service</h2>
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {services.map((svc, idx) => (
            <button
              key={svc.id}
              onClick={() => selectService(svc)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '16px 20px', background: 'transparent',
                border: 'none', borderBottom: idx < services.length - 1 ? `1px solid ${BORDER}` : 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{svc.name}</p>
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>{svc.duration_minutes} min</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: GOLD }}>${Number(svc.price_aud).toFixed(2)}</span>
                <span style={{ color: MUTED, fontSize: 18 }}>›</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Select slot ───────────────────────────────────────────────────────────────

  if (step === 'select-slot') {
    return (
      <div>
        <button onClick={() => setStep('select-service')} style={backBtnStyle}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Pick a Time</h2>
        <p style={{ color: MUTED, fontSize: 14, margin: '0 0 16px' }}>
          {selService?.name} · {selService?.duration_minutes} min
        </p>

        {daysWithSlots.length === 0 ? (
          <div style={{
            background: CARD, borderRadius: 16, padding: 32,
            textAlign: 'center', border: `1px solid ${BORDER}`,
          }}>
            <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
              No availability in the next 14 days. Check back soon.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {daysWithSlots.map(day => (
              <div key={day.date}>
                <p style={{
                  fontSize: 13, fontWeight: 700, color: GOLD,
                  margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {day.label}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {day.slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => selectSlot(day.date, day.label, slot)}
                      style={{
                        padding: '8px 14px', borderRadius: 10,
                        border: `1px solid ${BORDER}`, background: CARD,
                        color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      {fmtSlotTime(slot)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Details ───────────────────────────────────────────────────────────────────

  if (step === 'details') {
    return (
      <div>
        <button onClick={() => setStep('select-slot')} style={backBtnStyle}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Your Details</h2>
        <p style={{ color: MUTED, fontSize: 14, margin: '0 0 20px' }}>
          {selService?.name} · {selDateLabel} at {fmtSlotTime(selTime)}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" type="email" />
          </div>
          <div>
            <label style={labelStyle}>Phone (optional)</label>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0400 000 000" type="tel" />
          </div>
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any requests?" />
          </div>
        </div>

        {error && <p style={{ color: '#FF6B6B', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button
          onClick={submitBooking}
          disabled={submitting}
          style={{
            width: '100%', height: 52, marginTop: 24,
            background: submitting ? MUTED : GOLD,
            border: 'none', borderRadius: 14, cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: 16, fontWeight: 800, color: BG,
          }}
        >
          {submitting ? 'Booking…' : 'Confirm Booking'}
        </button>
      </div>
    )
  }

  return null
}

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: GOLD,
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
  padding: '0 0 16px', display: 'block',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'rgba(255,255,255,0.7)', marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', background: CARD,
  border: `1px solid ${BORDER}`, borderRadius: 12,
  color: '#fff', fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
}
