import type { Lead, LeadFormData, Event } from '@/types/lead'

// ============================================================================
// CONFIGURATION
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || ''

// ============================================================================
// EVENTS API
// ============================================================================

export async function getActiveEvents(): Promise<Event[]> {
  try {
    const response = await fetch(`${API_URL}/api/events`)
    if (!response.ok) throw new Error('Failed to fetch events')
    return await response.json()
  } catch (error) {
    console.error('[Events] Error:', error)
    // Fallback to dummy data if API is unavailable
    return [
      {
        id: 'evt_001',
        name: 'PRS Tech Summit 2026',
        description: 'Conferencia de tecnología e innovación',
        date: '2026-04-15',
        location: 'Ciudad de Panamá',
        isActive: true,
      },
    ]
  }
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const events = await getActiveEvents()
  return events.find((e) => e.id === eventId) ?? null
}

// ============================================================================
// LEADS API
// ============================================================================

export async function submitLead(
  data: LeadFormData,
  eventId: string,
  cardImage?: string
): Promise<{ success: boolean; message: string; lead?: Lead }> {
  try {
    const response = await fetch(`${API_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        company: data.company,
        companyType: data.companyType,
        eventId,
        cardImage,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Error al registrar',
      }
    }

    console.log('[Lead] Created:', result.lead?.id)
    return {
      success: true,
      message:
        'Gracias por visitarnos. Pronto te contactaremos.',
      lead: result.lead,
    }
  } catch (error) {
    console.error('[Lead] Error:', error)
    return {
      success: false,
      message: 'Error de conexión. Intenta nuevamente.',
    }
  }
}

export interface LeadsResponse {
  leads: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface LeadsQueryParams {
  page?: number
  limit?: number
  search?: string
  status?: 'pending' | 'confirmed' | 'contacted'
}

export async function getAllLeads(params: LeadsQueryParams = {}): Promise<LeadsResponse> {
  try {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.search) searchParams.set('search', params.search)
    if (params.status) searchParams.set('status', params.status)

    const query = searchParams.toString()
    const url = `${API_URL}/api/leads${query ? `?${query}` : ''}`

    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch leads')
    return await response.json()
  } catch (error) {
    console.error('[Leads] Error:', error)
    return {
      leads: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  }
}

export async function getLeadStats(): Promise<{
  total: number
  pending: number
  confirmed: number
  contacted: number
}> {
  try {
    const response = await fetch(`${API_URL}/api/leads/stats`)
    if (!response.ok) throw new Error('Failed to fetch stats')
    return await response.json()
  } catch (error) {
    console.error('[Stats] Error:', error)
    return { total: 0, pending: 0, confirmed: 0, contacted: 0 }
  }
}

export async function getLeadCardImage(
  leadId: string
): Promise<{ url: string | null }> {
  try {
    const response = await fetch(`${API_URL}/api/leads/${leadId}/card-image`)
    if (!response.ok) throw new Error('Failed to fetch card image')
    return await response.json()
  } catch (error) {
    console.error('[CardImage] Error:', error)
    return { url: null }
  }
}

// ============================================================================
// OCR API
// ============================================================================

export async function processOCR(
  imageBase64: string
): Promise<{
  success: boolean
  data?: {
    fullName: string
    email: string
    phone: string
    company: string
  }
}> {
  try {
    const response = await fetch(`${API_URL}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('[OCR] Error:', result.error)
      return { success: false }
    }

    console.log('[OCR] Extracted:', result.data)
    return { success: true, data: result.data }
  } catch (error) {
    console.error('[OCR] Error:', error)
    return { success: false }
  }
}
