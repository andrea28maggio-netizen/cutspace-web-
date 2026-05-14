import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import BookingFlow from './BookingFlow'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type Service = {
  id: string
  name: string
  duration_minutes: number
  price_aud: number
}

type BarberProfile = {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  instagram_handle: string | null
  specialties: string[] | null
  profiles: { full_name: string }
}

export type AvailDay = {
  date: string       // 'YYYY-MM-DD'
  startTime: string  // 'HH:MM' 24h
  endTime: string    // 'HH:MM' 24h
  label: string      // 'Mon 14 Apr' for display
}

export type BookedSlot = {
  slot_date: string  // 'YYYY-MM-DD'
  slot_time: string  // 'HH:MM' 24h
}

function toDateStr(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

async function fetchBarber(username: string): Promise<BarberProfile | null> {
  const { data, error } = await supabase
    .from('barber_profiles')
    .select('*, profiles(full_name)')
    .eq('username', username)
    .single()
  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[fetchBarber] username=%s code=%s msg=%s', username, error.code, error.message)
    }
    return null
  }
  return data as BarberProfile | null
}

async function fetchServices(barberId: string): Promise<Service[]> {
  const { data } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_aud')
    .eq('barber_id', barberId)
    .eq('is_active', true)
    .order('price_aud')
  return (data ?? []) as Service[]
}

async function fetchAvailability(barberId: string): Promise<AvailDay[]> {
  const today = new Date()
  const from  = toDateStr(addDays(today, 1))
  const to    = toDateStr(addDays(today, 14))
  const { data } = await supabase
    .from('barber_availability')
    .select('specific_date, start_time, end_time')
    .eq('barber_id', barberId)
    .eq('is_available', true)
    .gte('specific_date', from)
    .lte('specific_date', to)
    .order('specific_date')
  return (data ?? []).map(row => ({
    date:      row.specific_date as string,
    startTime: row.start_time as string,
    endTime:   row.end_time as string,
    label:     new Date(row.specific_date + 'T12:00:00').toLocaleDateString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short',
    }),
  }))
}

async function fetchBookedSlots(barberId: string, dates: string[]): Promise<BookedSlot[]> {
  if (dates.length === 0) return []
  const { data } = await supabase
    .from('client_bookings')
    .select('slot_date, slot_time')
    .eq('barber_id', barberId)
    .in('slot_date', dates)
  return (data ?? []) as BookedSlot[]
}

export async function generateMetadata(
  { params }: { params: Promise<{ username: string }> }
): Promise<Metadata> {
  const { username } = await params
  const barber = await fetchBarber(username)
  if (!barber) return { title: 'Barber not found — CutSpace' }
  const name = barber.profiles?.full_name ?? username
  return {
    title: `Book ${name} — CutSpace`,
    description: barber.bio ?? `Book an appointment with ${name} on CutSpace.`,
    openGraph: {
      title: `Book ${name} on CutSpace`,
      description: barber.bio ?? `Book an appointment with ${name}.`,
      images: barber.avatar_url ? [barber.avatar_url] : [],
    },
  }
}

export default async function BarberPage(
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const barber = await fetchBarber(username)
  if (!barber) notFound()

  const [services, availDays] = await Promise.all([
    fetchServices(barber.id),
    fetchAvailability(barber.id),
  ])
  const bookedSlots = await fetchBookedSlots(barber.id, availDays.map(d => d.date))

  const name = barber.profiles?.full_name ?? username

  return (
    <main style={{ minHeight: '100vh', padding: '56px 20px 48px', maxWidth: 520, margin: '0 auto' }}>

      {/* Hero card */}
      <div style={{
        background: '#252D3D', borderRadius: 20, padding: 32,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: 28, border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {barber.avatar_url ? (
          <img
            src={barber.avatar_url}
            alt={name}
            style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 16 }}
          />
        ) : (
          <div style={{
            width: 96, height: 96, borderRadius: '50%', background: '#C9A85C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 900, color: '#1E2432', marginBottom: 16,
          }}>
            {name[0].toUpperCase()}
          </div>
        )}

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>{name}</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 16px' }}>@{barber.username}</p>

        {barber.bio && (
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
            lineHeight: 1.6, margin: '0 0 16px',
          }}>
            {barber.bio}
          </p>
        )}

        {(barber.specialties?.length ?? 0) > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
            {barber.specialties!.map(tag => (
              <span key={tag} style={{
                padding: '5px 12px', borderRadius: 20,
                border: '1px solid #C9A85C', color: '#C9A85C',
                fontSize: 12, fontWeight: 600,
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {barber.instagram_handle && (
          <a
            href={`https://instagram.com/${barber.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#C9A85C', fontSize: 13, textDecoration: 'none' }}
          >
            @{barber.instagram_handle}
          </a>
        )}
      </div>

      {/* Services */}
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>Services</h2>

      {services.length === 0 ? (
        <div style={{
          background: '#252D3D', borderRadius: 16, padding: 32,
          textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 20,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: 0 }}>No services listed yet.</p>
        </div>
      ) : (
        <div style={{
          background: '#252D3D', borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden', marginBottom: 24,
        }}>
          {services.map((svc, idx) => (
            <div
              key={svc.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: idx < services.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{svc.name}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{svc.duration_minutes} min</p>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#C9A85C', margin: 0 }}>
                ${Number(svc.price_aud).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Booking flow */}
      <BookingFlow
        barberId={barber.id}
        services={services}
        availabilityDays={availDays}
        bookedSlots={bookedSlots}
      />

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 40 }}>
        Powered by CutSpace
      </p>
    </main>
  )
}
