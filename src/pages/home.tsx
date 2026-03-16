import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { LeadForm } from '@/components/lead-form'
import { getActiveEvents } from '@/services/leads'
import type { Event } from '@/types/lead'
import { Loader2, Settings } from 'lucide-react'

export function HomePage() {
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadEvent() {
      const activeEvents = await getActiveEvents()
      if (activeEvents.length > 0) {
        setEvent(activeEvents[0])
      }
      setIsLoading(false)
    }
    loadEvent()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-muted overflow-hidden relative">
      {/* Admin link */}
      <Link
        to="/admin"
        className="absolute top-4 right-4 z-20 p-2 text-muted-foreground hover:text-foreground transition-colors"
        title="Admin"
      >
        <Settings className="h-5 w-5" />
      </Link>

      {/* Content */}
      <div className="relative z-10 flex min-h-svh flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl space-y-8 md:space-y-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center space-y-3"
          >
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground"
            >
              Lead Registry
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="text-muted-foreground text-sm md:text-base"
            >
              Captura de clientes en eventos
            </motion.p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            {event && <LeadForm event={event} />}
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="absolute bottom-0 left-0 right-0 py-4 text-center"
      >
        <p className="text-xs text-muted-foreground">Lead Registry by Koudrs</p>
      </motion.footer>
    </div>
  )
}
