import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { Resend } from 'resend'
import { Pool } from 'pg'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import dotenv from 'dotenv'
import { renderWelcomeEmail } from './emails/welcome-email.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'

// R2 Client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/prs_campaign',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

// Test DB connection
pool.query('SELECT NOW()')
  .then(() => console.log('[DB] Connected to PostgreSQL'))
  .catch((err) => console.error('[DB] Connection error:', err.message))

const resend = new Resend(process.env.RESEND_API_KEY)

app.use(cors())
app.use(express.json({ limit: '10mb' }))

// ============================================================================
// EVENTS ENDPOINTS
// ============================================================================

app.get('/api/events', async (_, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, description, date, location, is_active FROM events WHERE is_active = true ORDER BY date ASC'
    )
    const events = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      date: row.date,
      location: row.location,
      isActive: row.is_active,
    }))
    res.json(events)
  } catch (err) {
    console.error('[Events] Error:', err)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

interface EventRequest {
  name: string
  description?: string
  date?: string
  location?: string
}

app.post('/api/events', async (req, res) => {
  const { name, description, date, location } = req.body as EventRequest

  if (!name) {
    return res.status(400).json({ error: 'Event name is required' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO events (name, description, date, location, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, description, date, location, is_active`,
      [name, description || null, date || null, location || null]
    )

    const row = result.rows[0]
    const event = {
      id: row.id,
      name: row.name,
      description: row.description,
      date: row.date,
      location: row.location,
      isActive: row.is_active,
    }

    console.log('[Events] Created:', event.id)
    res.status(201).json({ success: true, event })
  } catch (err) {
    console.error('[Events] Create error:', err)
    res.status(500).json({ error: 'Failed to create event' })
  }
})

app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params
  const { name, description, date, location } = req.body as EventRequest

  if (!name) {
    return res.status(400).json({ error: 'Event name is required' })
  }

  try {
    const result = await pool.query(
      `UPDATE events
       SET name = $1, description = $2, date = $3, location = $4
       WHERE id = $5 AND is_active = true
       RETURNING id, name, description, date, location, is_active`,
      [name, description || null, date || null, location || null, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const row = result.rows[0]
    const event = {
      id: row.id,
      name: row.name,
      description: row.description,
      date: row.date,
      location: row.location,
      isActive: row.is_active,
    }

    console.log('[Events] Updated:', event.id)
    res.json({ success: true, event })
  } catch (err) {
    console.error('[Events] Update error:', err)
    res.status(500).json({ error: 'Failed to update event' })
  }
})

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params

  try {
    // Check if event has leads associated
    const leadsCheck = await pool.query('SELECT COUNT(*) FROM leads WHERE event_id = $1', [id])
    const leadsCount = parseInt(leadsCheck.rows[0].count)

    if (leadsCount > 0) {
      return res.status(400).json({
        error: `No se puede eliminar: hay ${leadsCount} lead(s) asociados a este evento`
      })
    }

    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    console.log('[Events] Deleted:', id)
    res.json({ success: true, id })
  } catch (err) {
    console.error('[Events] Delete error:', err)
    res.status(500).json({ error: 'Failed to delete event' })
  }
})

// ============================================================================
// LEADS ENDPOINTS
// ============================================================================

interface LeadRequest {
  fullName: string
  email: string
  phone: string
  company: string
  companyType: string
  eventId: string
  cardImage?: string // base64 image
}

// Helper: Upload image to R2 (converts to WebP at 76% quality)
async function uploadImageToR2(base64Image: string, leadId: string): Promise<string | null> {
  try {
    // Extract base64 data
    const matches = base64Image.match(/^data:(.+);base64,(.+)$/)
    if (!matches) return null

    const base64Data = matches[2]
    const originalBuffer = Buffer.from(base64Data, 'base64')

    // Convert to WebP at 76% quality
    const webpBuffer = await sharp(originalBuffer)
      .webp({ quality: 76 })
      .toBuffer()

    const originalSize = originalBuffer.length
    const compressedSize = webpBuffer.length
    const savings = ((1 - compressedSize / originalSize) * 100).toFixed(1)
    console.log(`[R2] Compressed: ${(originalSize / 1024).toFixed(1)}KB -> ${(compressedSize / 1024).toFixed(1)}KB (${savings}% saved)`)

    // Generate filename with .webp extension
    const filename = `cards/${leadId}.webp`

    // Upload to R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
        Body: webpBuffer,
        ContentType: 'image/webp',
      })
    )

    console.log('[R2] Uploaded:', filename)
    return filename
  } catch (err) {
    console.error('[R2] Upload error:', err)
    return null
  }
}

app.post('/api/leads', async (req, res) => {
  const { fullName, email, phone, company, companyType, eventId, cardImage } = req.body as LeadRequest

  if (!fullName || !email || !phone || !eventId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Check for duplicate
    const existing = await pool.query(
      'SELECT id FROM leads WHERE email = $1 AND event_id = $2',
      [email, eventId]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ya estás registrado en este evento' })
    }

    // Get event details for email
    const eventResult = await pool.query(
      'SELECT name, date, location, description FROM events WHERE id = $1',
      [eventId]
    )
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado' })
    }
    const eventData = eventResult.rows[0]
    const eventName = eventData.name
    const eventLocation = eventData.location
    const eventDescription = eventData.description

    // Insert lead
    const result = await pool.query(
      `INSERT INTO leads (full_name, email, phone, company, company_type, event_id, status, email_sent)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', false)
       RETURNING id, created_at`,
      [fullName, email, phone, company, companyType, eventId]
    )

    const leadId = result.rows[0].id

    // Upload card image to R2 if provided
    let cardImageUrl: string | null = null
    if (cardImage) {
      cardImageUrl = await uploadImageToR2(cardImage, leadId)
      if (cardImageUrl) {
        await pool.query('UPDATE leads SET card_image_url = $1 WHERE id = $2', [cardImageUrl, leadId])
      }
    }

    const lead = {
      id: leadId,
      fullName,
      email,
      phone,
      company,
      companyType,
      eventId,
      eventName,
      cardImageUrl,
      createdAt: result.rows[0].created_at,
      status: 'pending',
    }

    // Send confirmation email
    try {
      const registrationDate = new Date().toLocaleDateString('es-PA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      const emailHtml = await renderWelcomeEmail({
        fullName,
        eventName,
        registrationDate,
        eventLocation: eventLocation || 'Ciudad de Panama',
        eventDescription: eventDescription || 'Gracias por visitarnos en nuestro stand.',
      })

      const { data, error } = await resend.emails.send({
        from: 'Premium Rush Cargo <noreply@koudrs.com>',
        to: [email],
        subject: `¡Gracias por visitarnos en ${eventName}! - Premium Rush Cargo`,
        html: emailHtml,
      })

      if (!error && data?.id) {
        await pool.query(
          "UPDATE leads SET email_sent = true, status = 'confirmed' WHERE id = $1",
          [lead.id]
        )
        lead.status = 'confirmed'
        console.log('[Email] Sent:', data.id)
      }
    } catch (emailErr) {
      console.error('[Email] Failed:', emailErr)
    }

    console.log('[Lead] Created:', lead.id)
    res.status(201).json({ success: true, lead })
  } catch (err) {
    console.error('[Lead] Error:', err)
    res.status(500).json({ error: 'Failed to create lead' })
  }
})

app.get('/api/leads', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const search = (req.query.search as string || '').trim()
    const status = req.query.status as string
    const offset = (page - 1) * limit

    // Build query with optional filters
    const conditions: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    if (search) {
      // Search by name, email, company, or phone (case-insensitive)
      conditions.push(`(
        l.full_name ILIKE $${paramIndex} OR
        l.email ILIKE $${paramIndex} OR
        l.company ILIKE $${paramIndex} OR
        l.phone ILIKE $${paramIndex}
      )`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (status && ['pending', 'confirmed', 'contacted'].includes(status)) {
      conditions.push(`l.status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    // Get paginated leads
    const result = await pool.query(
      `SELECT l.*, e.name as event_name
       FROM leads l
       JOIN events e ON l.event_id = e.id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    const leads = result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      companyType: row.company_type,
      eventId: row.event_id,
      eventName: row.event_name,
      status: row.status,
      emailSent: row.email_sent,
      cardImageUrl: row.card_image_url,
      createdAt: row.created_at,
    }))

    res.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error('[Leads] Error:', err)
    res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

app.get('/api/leads/stats', async (_, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted
      FROM leads
    `)
    const stats = result.rows[0]
    res.json({
      total: parseInt(stats.total),
      pending: parseInt(stats.pending),
      confirmed: parseInt(stats.confirmed),
      contacted: parseInt(stats.contacted),
    })
  } catch (err) {
    console.error('[Stats] Error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Get signed URL for card image
app.get('/api/leads/:id/card-image', async (req, res) => {
  const { id } = req.params

  try {
    const result = await pool.query('SELECT card_image_url FROM leads WHERE id = $1', [id])
    if (result.rows.length === 0 || !result.rows[0].card_image_url) {
      return res.status(404).json({ error: 'Image not found' })
    }

    const key = result.rows[0].card_image_url
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }) // 1 hour
    res.json({ url: signedUrl })
  } catch (err) {
    console.error('[Image] Error:', err)
    res.status(500).json({ error: 'Failed to get image URL' })
  }
})

// ============================================================================
// OCR ENDPOINT (Mistral)
// ============================================================================

app.post('/api/ocr', async (req, res) => {
  const { image } = req.body as { image: string }

  if (!image) {
    return res.status(400).json({ error: 'No image provided' })
  }

  const mistralKey = process.env.MISTRAL_API_KEY
  if (!mistralKey) {
    return res.status(500).json({ error: 'Mistral API key not configured' })
  }

  try {
    // Step 1: Use Mistral OCR endpoint to extract text
    console.log('[OCR] Processing image with mistral-ocr-latest...')
    const ocrResponse = await fetch('https://api.mistral.ai/v1/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mistralKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-ocr-latest',
        document: {
          type: 'image_url',
          image_url: image,
        },
      }),
    })

    console.log('[OCR] OCR Response status:', ocrResponse.status)

    if (!ocrResponse.ok) {
      const errorData = await ocrResponse.text()
      console.error('[OCR] Mistral OCR error:', errorData)
      return res.status(500).json({ error: 'OCR processing failed', details: errorData })
    }

    const ocrData = await ocrResponse.json()
    console.log('[OCR] OCR Response:', JSON.stringify(ocrData, null, 2))

    // Extract text from OCR response
    let rawText = ''
    if (ocrData.pages && Array.isArray(ocrData.pages)) {
      for (const page of ocrData.pages) {
        if (page.markdown) rawText += page.markdown + '\n'
        else if (page.text) rawText += page.text + '\n'
      }
    }
    rawText = rawText.trim()

    if (!rawText) {
      console.error('[OCR] No text detected in image')
      return res.status(400).json({ error: 'No se detectó texto en la imagen' })
    }

    console.log('[OCR] Extracted text:', rawText)

    // Step 2: Use chat to structure the data
    const chatResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mistralKey}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'user',
            content: `Analiza el siguiente texto extraído de una tarjeta de presentación y extrae los datos en formato JSON:

Texto OCR:
${rawText}

Extrae estos campos (usa "" si no se encuentra):
{
  "fullName": "nombre completo de la persona",
  "email": "correo electrónico",
  "phone": "número de teléfono",
  "company": "nombre de la empresa"
}

Responde SOLO con el JSON, sin explicaciones.`,
          },
        ],
        max_tokens: 500,
      }),
    })

    if (!chatResponse.ok) {
      // Si el chat falla, intentar extraer con regex básico
      console.log('[OCR] Chat failed, using regex extraction')
      const extracted = {
        fullName: '',
        email: rawText.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]?.replace(/@.*/, '') || '',
        phone: rawText.match(/[\+]?[\d\s\-\(\)]{7,}/)?.[0]?.trim() || '',
        company: '',
      }
      // Try to find email
      const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/)
      if (emailMatch) extracted.email = emailMatch[0]

      return res.json({ success: true, data: extracted, rawText })
    }

    const chatData = await chatResponse.json()
    const content = chatData.choices?.[0]?.message?.content || ''
    console.log('[OCR] Chat response:', content)

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0])
      console.log('[OCR] Extracted data:', extracted)
      res.json({ success: true, data: extracted, rawText })
    } else {
      console.error('[OCR] Could not parse JSON from:', content)
      res.status(500).json({ error: 'Could not parse OCR response' })
    }
  } catch (err) {
    console.error('[OCR] Error:', err)
    res.status(500).json({ error: 'OCR processing failed' })
  }
})

// ============================================================================
// TEST EMAIL ENDPOINT
// ============================================================================

interface TestEmailRequest {
  email: string
  eventId: string
}

app.post('/api/test-email', async (req, res) => {
  const { email, eventId } = req.body as TestEmailRequest

  if (!email || !eventId) {
    return res.status(400).json({ error: 'Email and eventId are required' })
  }

  try {
    // Get event details
    const eventResult = await pool.query(
      'SELECT name, date, location, description FROM events WHERE id = $1',
      [eventId]
    )

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const eventData = eventResult.rows[0]
    const registrationDate = new Date().toLocaleDateString('es-PA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const emailHtml = await renderWelcomeEmail({
      fullName: 'Usuario de Prueba',
      eventName: eventData.name,
      registrationDate,
      eventLocation: eventData.location || 'Ciudad de Panama',
      eventDescription: eventData.description || 'Gracias por visitarnos en nuestro stand.',
    })

    const { data, error } = await resend.emails.send({
      from: 'Premium Rush Cargo <noreply@koudrs.com>',
      to: [email],
      subject: `¡Gracias por visitarnos en ${eventData.name}! - Premium Rush Cargo`,
      html: emailHtml,
    })

    if (error) {
      console.error('[Test Email] Error:', error)
      return res.status(400).json({ error: error.message })
    }

    console.log('[Test Email] Sent:', data?.id)
    return res.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('[Test Email] Exception:', err)
    return res.status(500).json({ error: 'Failed to send test email' })
  }
})

// ============================================================================
// LEGACY EMAIL ENDPOINT (for compatibility)
// ============================================================================

app.post('/api/send-email', async (req, res) => {
  const { fullName, email, eventName } = req.body

  if (!fullName || !email || !eventName) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'PRS Delivery <campaigns@koudrs.com>',
      to: [email],
      subject: `¡Gracias por visitarnos! - ${eventName}`,
      html: generateEmailHtml(fullName, eventName),
    })

    if (error) {
      console.error('[Resend] Error:', error)
      return res.status(400).json({ error: error.message })
    }

    console.log('[Resend] Email sent:', data?.id)
    return res.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('[Resend] Exception:', err)
    return res.status(500).json({ error: 'Failed to send email' })
  }
})

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', async (_, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.json({ status: 'ok', db: 'disconnected' })
  }
})

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

function generateEmailHtml(fullName: string, eventName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Registro - PRS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 40px 20px; max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background-color: #2563eb; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </div>
      <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #0f172a;">
        PRS Delivery
      </h1>
    </div>

    <div style="background-color: #ffffff; border-radius: 8px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h2 style="font-size: 22px; font-weight: 600; margin-top: 0; margin-bottom: 16px; color: #0f172a;">
        ¡Gracias por visitarnos, ${fullName}!
      </h2>

      <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
        Fue un gusto conocerte en <strong style="color: #2563eb;">${eventName}</strong>. Hemos guardado tus datos y pronto un asesor se pondrá en contacto contigo.
      </p>

      <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #2563eb;">
        <p style="font-size: 14px; color: #1e40af; margin: 0;">
          Te enviaremos información sobre nuestros servicios de logística y delivery.
        </p>
      </div>

      <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
        Si tienes alguna pregunta, no dudes en contactarnos.
      </p>
    </div>

    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 8px 0;">
        © 2026 PRS Delivery · Panamá
      </p>
      <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
        Este correo fue enviado porque nos visitaste en nuestro stand.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

// ============================================================================
// SERVE FRONTEND IN PRODUCTION
// ============================================================================

if (isProduction) {
  const distPath = path.join(__dirname, '../dist')

  // Serve static files
  app.use(express.static(distPath))

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })

  console.log('[Server] Serving frontend from:', distPath)
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on http://0.0.0.0:${PORT}`)
  console.log(`[Server] Mode: ${isProduction ? 'production' : 'development'}`)
  console.log(`[Server] Resend API Key: ${process.env.RESEND_API_KEY ? 'configured' : 'NOT SET'}`)
  console.log(`[Server] Mistral API Key: ${process.env.MISTRAL_API_KEY ? 'configured' : 'NOT SET'}`)
})
