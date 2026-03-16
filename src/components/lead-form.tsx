import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { submitLead, processOCR } from '@/services/leads'
import type { LeadFormData, Event, CompanyType } from '@/types/lead'
import { COMPANY_TYPES } from '@/types/lead'
import { CheckCircle, Loader2, Send, Camera, AlertCircle } from 'lucide-react'

// Dominios de email genéricos que no representan una empresa
const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com',
  'mail.com', 'zoho.com', 'yandex.com', 'gmx.com', 'inbox.com',
]

function isGenericEmailDomain(domain: string): boolean {
  return GENERIC_EMAIL_DOMAINS.includes(domain.toLowerCase())
}

interface LeadFormProps {
  event: Event
}

export function LeadForm({ event }: LeadFormProps) {
  const [formData, setFormData] = useState<LeadFormData>({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    companyType: '' as CompanyType,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [cardImage, setCardImage] = useState<string | null>(null)
  const [scannedOnce, setScannedOnce] = useState(false) // Track if OCR was used
  const [submitResult, setSubmitResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check which fields are missing after OCR scan
  const getMissingFields = () => {
    if (!scannedOnce) return {}
    return {
      fullName: !formData.fullName.trim(),
      email: !formData.email.trim(),
      phone: !formData.phone.trim(),
      company: !formData.company.trim(),
      companyType: !formData.companyType,
    }
  }
  const missingFields = getMissingFields()
  const hasMissingFields = Object.values(missingFields).some(Boolean)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.companyType) {
      setSubmitResult({ success: false, message: 'Selecciona el tipo de empresa' })
      return
    }
    setIsSubmitting(true)
    setSubmitResult(null)

    const result = await submitLead(formData, event.id, cardImage || undefined)

    setSubmitResult(result)
    setIsSubmitting(false)

    if (result.success) {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        company: '',
        companyType: '' as CompanyType,
      })
      setCardImage(null)
      setScannedOnce(false)
    }
  }

  const handleScanCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Save the image for later upload
      setCardImage(base64)

      const result = await processOCR(base64)

      if (result.success && result.data) {
        const data = result.data
        let company = data.company || ''
        const email = data.email || ''

        if (!company && email) {
          const domain = email.split('@')[1]
          if (domain && !isGenericEmailDomain(domain)) {
            company = domain.split('.')[0]
            company = company.charAt(0).toUpperCase() + company.slice(1)
          }
        }

        setFormData((prev) => ({
          ...prev,
          fullName: data.fullName || '',
          email,
          phone: data.phone || '',
          company,
        }))
        setScannedOnce(true) // Mark that OCR was used
      }
    } catch (err) {
      console.error('[OCR] Error:', err)
    } finally {
      setIsScanning(false)
    }
  }

  if (submitResult?.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-lg p-8 md:p-10 shadow-sm"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="h-16 w-16 md:h-20 md:w-20 text-emerald-500" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl font-semibold text-foreground"
          >
            ¡Cliente guardado!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-sm"
          >
            {submitResult.message}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="outline"
              onClick={() => setSubmitResult(null)}
              className="mt-4"
            >
              Registrar otro cliente
            </Button>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg p-6 md:p-8 shadow-sm">
      {/* Scan button - full width */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleScanCard}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanning}
          className="w-full gap-2 h-12"
        >
          {isScanning ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          {isScanning ? 'Escaneando tarjeta...' : 'Escanear tarjeta de presentación'}
        </Button>
      </div>

      {/* Missing fields alert */}
      {hasMissingFields && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Algunos campos no se detectaron. Por favor completa los campos resaltados.</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className={missingFields.fullName ? 'text-amber-600 font-medium' : ''}>
            Nombre completo {missingFields.fullName && <span className="text-amber-500">- No detectado</span>}
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            placeholder={missingFields.fullName ? '⚠ Ingresa el nombre manualmente' : 'Juan Pérez'}
            value={formData.fullName}
            onChange={handleChange}
            required
            disabled={isSubmitting || isScanning}
            className={missingFields.fullName ? 'border-amber-400 bg-amber-50/50 placeholder:text-amber-600 focus:border-amber-500 focus:ring-amber-500' : ''}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className={missingFields.email ? 'text-amber-600 font-medium' : ''}>
            Correo electrónico {missingFields.email && <span className="text-amber-500">- No detectado</span>}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={missingFields.email ? '⚠ Ingresa el correo manualmente' : 'juan@empresa.com'}
            value={formData.email}
            onChange={handleChange}
            required
            disabled={isSubmitting || isScanning}
            className={missingFields.email ? 'border-amber-400 bg-amber-50/50 placeholder:text-amber-600 focus:border-amber-500 focus:ring-amber-500' : ''}
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className={missingFields.phone ? 'text-amber-600 font-medium' : ''}>
            Teléfono {missingFields.phone && <span className="text-amber-500">- No detectado</span>}
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder={missingFields.phone ? '⚠ Ingresa el teléfono manualmente' : '+507 6000-0000'}
            value={formData.phone}
            onChange={handleChange}
            required
            disabled={isSubmitting || isScanning}
            className={missingFields.phone ? 'border-amber-400 bg-amber-50/50 placeholder:text-amber-600 focus:border-amber-500 focus:ring-amber-500' : ''}
          />
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company" className={missingFields.company ? 'text-amber-600 font-medium' : ''}>
            Empresa {missingFields.company && <span className="text-amber-500">- No detectado</span>}
          </Label>
          <Input
            id="company"
            name="company"
            type="text"
            placeholder={missingFields.company ? '⚠ Ingresa la empresa manualmente' : 'Nombre de la empresa'}
            value={formData.company}
            onChange={handleChange}
            required
            disabled={isSubmitting || isScanning}
            className={missingFields.company ? 'border-amber-400 bg-amber-50/50 placeholder:text-amber-600 focus:border-amber-500 focus:ring-amber-500' : ''}
          />
        </div>

        {/* Company Type */}
        <div className="space-y-2">
          <Label className={missingFields.companyType ? 'text-amber-600' : ''}>
            Tipo de empresa {missingFields.companyType && <span className="text-amber-500">*</span>}
          </Label>
          <Select
            value={formData.companyType}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, companyType: value as CompanyType }))
            }
            disabled={isSubmitting || isScanning}
          >
            <SelectTrigger className={`w-full ${missingFields.companyType ? 'border-amber-400 bg-amber-50' : ''}`}>
              <SelectValue placeholder="Selecciona el tipo de empresa" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error message */}
        {submitResult && !submitResult.success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3"
          >
            {submitResult.message}
          </motion.div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isScanning}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-5 w-5" />
              Guardar contacto
            </>
          )}
        </Button>
      </form>
    </div>
  )
}
