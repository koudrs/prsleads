export const COMPANY_TYPES = [
  { value: 'logistics', label: 'Logística y Transporte' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'retail', label: 'Retail / Comercio' },
  { value: 'manufacturing', label: 'Manufactura' },
  { value: 'food', label: 'Alimentos y Bebidas' },
  { value: 'pharma', label: 'Farmacéutica' },
  { value: 'tech', label: 'Tecnología' },
  { value: 'other', label: 'Otro' },
] as const

export type CompanyType = (typeof COMPANY_TYPES)[number]['value']

export interface Lead {
  id: string
  fullName: string
  email: string
  phone: string
  company: string
  companyType: CompanyType
  eventId: string
  eventName: string
  cardImageUrl?: string
  createdAt: string
  status: 'pending' | 'confirmed' | 'contacted'
}

export interface LeadFormData {
  fullName: string
  email: string
  phone: string
  company: string
  companyType: CompanyType
}

export interface Event {
  id: string
  name: string
  description: string
  date: string
  location: string
  isActive: boolean
}
