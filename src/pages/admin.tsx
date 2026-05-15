import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  getAllLeads,
  getLeadStats,
  getLeadCardImage,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  sendTestEmail,
} from '@/services/leads'
import type { LeadsQueryParams, CreateEventData } from '@/services/leads'
import type { Lead, Event } from '@/types/lead'
import { COMPANY_TYPES } from '@/types/lead'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import {
  Users,
  Clock,
  CheckCircle,
  MessageCircle,
  RefreshCw,
  ArrowLeft,
  Eye,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Calendar,
  MapPin,
  Plus,
  Trash,
  Edit,
  Mail,
  Send,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogCloseButton,
} from '@/components/ui/dialog'

const statusConfig = {
  pending: { label: 'Pendiente', variant: 'secondary' as const, icon: Clock },
  confirmed: {
    label: 'Confirmado',
    variant: 'default' as const,
    icon: CheckCircle,
  },
  contacted: {
    label: 'Contactado',
    variant: 'outline' as const,
    icon: MessageCircle,
  },
}

const ITEMS_PER_PAGE = 20

export function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Get initial values from URL
  const initialPage = parseInt(searchParams.get('page') || '1')
  const initialSearch = searchParams.get('search') || ''
  const initialStatus = searchParams.get('status') as LeadsQueryParams['status'] | undefined

  const [leads, setLeads] = useState<Lead[]>([])
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 0,
  })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    contacted: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null)

  // Search & filter state
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || '')
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)

  // Events state
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [eventForm, setEventForm] = useState<CreateEventData>({
    name: '',
    description: '',
    date: '',
    location: '',
  })
  const [eventSaving, setEventSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Email test state
  const [testEmail, setTestEmail] = useState('')
  const [testEventId, setTestEventId] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Update URL when filters change
  const updateUrl = useCallback(
    (page: number, search: string, status: string) => {
      const params = new URLSearchParams()
      if (page > 1) params.set('page', String(page))
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      setSearchParams(params, { replace: true })
    },
    [setSearchParams]
  )

  const loadData = useCallback(
    async (page = pagination.page, search = searchQuery, status = statusFilter) => {
      setIsLoading(true)
      const params: LeadsQueryParams = {
        page,
        limit: ITEMS_PER_PAGE,
      }
      if (search) params.search = search
      if (status && status !== 'all') params.status = status as LeadsQueryParams['status']

      const [leadsResponse, statsData] = await Promise.all([
        getAllLeads(params),
        getLeadStats(),
      ])

      setLeads(leadsResponse.leads)
      setPagination(leadsResponse.pagination)
      setStats(statsData)
      setIsLoading(false)
      updateUrl(page, search, status === 'all' ? '' : status)
    },
    [pagination.page, searchQuery, statusFilter, updateUrl]
  )

  // Initial load
  useEffect(() => {
    loadData(initialPage, initialSearch, initialStatus || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchInput(value)

    if (searchTimeout) clearTimeout(searchTimeout)

    const timeout = setTimeout(() => {
      setSearchQuery(value)
      loadData(1, value, statusFilter)
    }, 300)

    setSearchTimeout(timeout)
  }

  const handleStatusChange = (value: string | null) => {
    const val = value || ''
    setStatusFilter(val)
    loadData(1, searchQuery, val)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return
    loadData(newPage, searchQuery, statusFilter)
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchQuery('')
    setStatusFilter('')
    loadData(1, '', '')
  }

  // Events functions
  const loadEvents = useCallback(async () => {
    setEventsLoading(true)
    const eventsData = await getAllEvents()
    setEvents(eventsData)
    setEventsLoading(false)
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const openNewEventDialog = () => {
    setEditingEvent(null)
    setEventForm({ name: '', description: '', date: '', location: '' })
    setEventDialogOpen(true)
  }

  const openEditEventDialog = (event: Event) => {
    setEditingEvent(event)
    setEventForm({
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
    })
    setEventDialogOpen(true)
  }

  const closeEventDialog = () => {
    setEventDialogOpen(false)
    setEditingEvent(null)
    setEventForm({ name: '', description: '', date: '', location: '' })
  }

  const handleSaveEvent = async () => {
    if (!eventForm.name || !eventForm.date || !eventForm.location) {
      setAlertMessage({ type: 'error', text: 'Completa todos los campos requeridos' })
      return
    }

    setEventSaving(true)
    let result

    if (editingEvent) {
      result = await updateEvent(editingEvent.id, eventForm)
    } else {
      result = await createEvent(eventForm)
    }

    setEventSaving(false)

    if (result.success) {
      setAlertMessage({ type: 'success', text: result.message })
      closeEventDialog()
      loadEvents()
    } else {
      setAlertMessage({ type: 'error', text: result.message })
    }
  }

  const handleToggleEventStatus = async (event: Event) => {
    const result = await updateEvent(event.id, { isActive: !event.isActive })
    if (result.success) {
      loadEvents()
    } else {
      setAlertMessage({ type: 'error', text: result.message })
    }
  }

  const handleDeleteEvent = async (id: string) => {
    const result = await deleteEvent(id)
    if (result.success) {
      setAlertMessage({ type: 'success', text: result.message })
      setDeleteConfirmId(null)
      loadEvents()
    } else {
      setAlertMessage({ type: 'error', text: result.message })
    }
  }

  // Email test functions
  const handleSendTestEmail = async () => {
    if (!testEmail || !testEventId) {
      setAlertMessage({ type: 'error', text: 'Ingresa un email y selecciona un evento' })
      return
    }

    setSendingEmail(true)
    const result = await sendTestEmail(testEmail, testEventId)
    setSendingEmail(false)

    if (result.success) {
      setAlertMessage({ type: 'success', text: result.message })
      setTestEmail('')
    } else {
      setAlertMessage({ type: 'error', text: result.message })
    }
  }

  // Clear alert after 5 seconds
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [alertMessage])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-PA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleViewCard = async (leadId: string) => {
    setLoadingImageId(leadId)
    try {
      const result = await getLeadCardImage(leadId)
      if (result.url) {
        setPreviewImage(result.url)
        setPreviewOpen(true)
      }
    } catch (err) {
      console.error('Error loading card image:', err)
    } finally {
      setLoadingImageId(null)
    }
  }

  const hasActiveFilters = searchQuery || statusFilter

  return (
    <div className="min-h-svh bg-muted p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Leads</h1>
              <p className="text-muted-foreground text-sm">
                Clientes captados en stand
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-xs text-muted-foreground">Total registros</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.pending}
                </p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.confirmed}
                </p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.contacted}
                </p>
                <p className="text-xs text-muted-foreground">Contactados</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Alert Message */}
      {alertMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="max-w-6xl mx-auto mb-4"
        >
          <div
            className={`p-4 rounded-xl border ${
              alertMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{alertMessage.text}</span>
              <button onClick={() => setAlertMessage(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Events Management & Email Test Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="max-w-6xl mx-auto mb-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events Management */}
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Gestion de Eventos</h2>
              </div>
              <Button size="sm" onClick={openNewEventDialog}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Evento
              </Button>
            </div>
            <div className="p-4">
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No hay eventos registrados</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">
                            {event.name}
                          </span>
                          <Badge variant={event.isActive ? 'default' : 'secondary'}>
                            {event.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {event.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleToggleEventStatus(event)}
                          title={event.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {event.isActive ? (
                            <X className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditEventDialog(event)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {deleteConfirmId === event.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              Eliminar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteConfirmId(event.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email Test */}
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center gap-2 p-4 border-b border-border">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Probar Email</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label htmlFor="test-email" className="text-sm font-medium text-foreground">
                  Email de prueba
                </Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="test-event" className="text-sm font-medium text-foreground">
                  Evento
                </Label>
                <Select value={testEventId} onValueChange={(v) => setTestEventId(v || '')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona un evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSendTestEmail}
                disabled={sendingEmail || !testEmail || !testEventId}
                className="w-full"
              >
                {sendingEmail ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Prueba
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="max-w-6xl mx-auto mb-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, email, empresa o teléfono..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="contacted">Contactado</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="mt-2 text-sm text-muted-foreground">
          {isLoading ? (
            'Cargando...'
          ) : (
            <>
              {pagination.total} resultado{pagination.total !== 1 ? 's' : ''}
              {hasActiveFilters && ' (filtrado)'}
            </>
          )}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {leads.length === 0 && !isLoading ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-foreground">
                {hasActiveFilters
                  ? 'No se encontraron resultados'
                  : 'No hay clientes registrados'}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {hasActiveFilters
                  ? 'Intenta con otros términos de búsqueda'
                  : 'Los contactos aparecerán aquí cuando los captures'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/50">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="w-16">Tarjeta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => {
                      const status = statusConfig[lead.status]
                      const StatusIcon = status.icon
                      return (
                        <TableRow
                          key={lead.id}
                          className="border-border hover:bg-muted/50"
                        >
                          <TableCell className="font-medium text-foreground">
                            {lead.fullName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lead.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lead.phone}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {lead.company}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {COMPANY_TYPES.find((t) => t.value === lead.companyType)
                              ?.label || lead.companyType}
                          </TableCell>
                          <TableCell>
                            <span className="text-primary text-sm font-medium">
                              {lead.eventName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1 text-xs">
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(lead.createdAt)}
                          </TableCell>
                          <TableCell>
                            {lead.cardImageUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewCard(lead.id)}
                                disabled={loadingImageId === lead.id}
                                className="h-8 w-8 p-0"
                              >
                                {loadingImageId === lead.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground/50 text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1 || isLoading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1 || isLoading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = pagination.page - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages || isLoading}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Card Image Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tarjeta de presentacion</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <div className="p-4">
            {previewImage && (
              <img
                src={previewImage}
                alt="Tarjeta de presentacion"
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Create/Edit Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
            </DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <div className="p-4 space-y-4">
            <div>
              <Label htmlFor="event-name" className="text-sm font-medium text-foreground">
                Nombre del evento *
              </Label>
              <Input
                id="event-name"
                placeholder="Ej: Tech Summit 2026"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="event-description" className="text-sm font-medium text-foreground">
                Descripcion
              </Label>
              <Input
                id="event-description"
                placeholder="Breve descripcion del evento"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="event-date" className="text-sm font-medium text-foreground">
                Fecha *
              </Label>
              <Input
                id="event-date"
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="event-location" className="text-sm font-medium text-foreground">
                Ubicacion *
              </Label>
              <Input
                id="event-location"
                placeholder="Ej: Ciudad de Panama"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={closeEventDialog}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEvent}
                disabled={eventSaving || !eventForm.name || !eventForm.date || !eventForm.location}
                className="flex-1"
              >
                {eventSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingEvent ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
