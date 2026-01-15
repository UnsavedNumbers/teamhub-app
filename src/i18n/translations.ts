/**
 * Single source of truth for all translations.
 * 
 * Structure:
 * - `en` is the primary locale and defines the schema
 * - `es` must match the `en` schema (enforced via TypeScript)
 * - To add a new locale, add a new key here matching the `en` schema
 * 
 * Key naming conventions:
 * - `common.*` - Shared UI elements (buttons, labels, states)
 * - `portal.*` - Portal-specific screens and features
 * - `admin.*` - Admin-specific screens and features
 * - `license.*` - License and subscription related
 * - `billing.*` - Billing and payment related
 * - `plans.*` - Plan features and pricing
 * - `checkout.*` - Checkout flow
 * - `errors.*` - Error messages
 */

export const en = {
    common: {
        loading: 'Loading...',
        error: 'Error',
        retry: 'Retry',
        save: 'Save',
        cancel: 'Cancel',
        close: 'Close',
        goBack: 'Go Back',
        viewDetails: 'View Details',
        edit: 'Edit',
        remove: 'Remove',
        add: 'Add',
        invite: 'Invite',
        change: 'Change',
        manage: 'Manage',
        download: 'Download',
    },
    license: {
        statusLabel: 'License Status',
        planLabel: 'Plan',
        renewalDate: 'Renews On',
        trialEnds: 'Trial Ends',
        graceEnds: 'Grace Ends',
        planStarter: 'Starter',
        planStandard: 'Standard',
        planPro: 'Pro',
        status: {
            trial: 'Trial',
            active: 'Active',
            past_due: 'Past Due',
            canceled: 'Canceled',
            expired: 'Expired',
        },
        badge: {
            trialTooltip: 'Trial ends on {{date}}',
            activeTooltip: 'Active until {{date}}',
            pastDueTooltip: 'Payment failed. Grace until {{date}}',
            canceledTooltip: 'Cancels on {{date}}',
            expiredTooltip: 'Subscription expired',
        },
        warning: {
            trial: 'Your trial ends on {{date}}. Add billing to continue.',
            pastDue: 'Payment failed. Update billing before {{date}} to avoid interruption.',
            canceled: 'Subscription cancels on {{date}}. Renew to stay active.',
            expired: 'Your license expired. Update billing to restore access.',
        },
        gate: {
            title: 'License Required',
            message: 'Your organization license is inactive. Update billing to continue.',
            action: 'Go to Billing',
        },
    },
    billing: {
        pageTitle: 'License & Billing',
        planSelectionTitle: 'Choose Your Plan',
        manageBilling: 'Manage Billing',
        upgradePlan: 'Upgrade Plan',
        downgradePlan: 'Downgrade Plan',
        changePlan: 'Change Plan',
        currentPlan: 'Current Plan',
        selectPlan: 'Select Plan',
        continueToCheckout: 'Continue to Checkout',
        checkoutSuccessTitle: 'Payment Successful',
        checkoutSuccessBody: 'Your organization license is active. Redirecting you to billing...',
        checkoutCancelTitle: 'Checkout Canceled',
        checkoutCancelBody: 'You canceled checkout. You can retry at any time.',
        viewBillingHistory: 'View Billing History',
        statusSectionTitle: 'Status',
        detailsSectionTitle: 'Details',
        actionsSectionTitle: 'Actions',
        renewalDate: 'Renewal Date',
        trialEnds: 'Trial Ends',
        graceEnds: 'Grace Ends',
        planLabel: 'Plan',
        pricePerYear: '{{price}} / year',
        portalCta: 'Open Customer Portal',
        checkoutCta: 'Start Checkout',
        errorLoading: 'Unable to load billing details.',
        errorCreatingSession: 'Unable to start checkout. Please try again.',
        errorCreatingPortal: 'Unable to open customer portal.',
        billingHistoryEmpty: 'No billing events yet.',
    },
    plans: {
        starter: {
            name: 'Starter',
            price: '$299',
            description: 'Core scheduling and roster tools for small programs.',
        },
        standard: {
            name: 'Standard',
            price: '$599',
            description: 'Expanded messaging, payments, and reporting.',
        },
        pro: {
            name: 'Pro',
            price: '$999',
            description: 'Full suite with travel, tryouts, and advanced insights.',
        },
        features: {
            scheduling: 'Scheduling & Calendar',
            rosters: 'Team Rosters & Attendance',
            messaging: 'Messaging & Announcements',
            payments: 'Payments & Invoices',
            uniforms: 'Uniform Ordering',
            travel: 'Travel Planning',
            tryouts: 'Tryouts Management',
            reporting: 'Reports & Analytics',
            support: 'Priority Support',
        },
    },
    checkout: {
        success: 'Success',
        cancel: 'Canceled',
        redirecting: 'Redirecting...',
        returnToBilling: 'Return to Billing',
    },
    errors: {
        missingOrganization: 'Organization is required to load billing.',
        unsupportedPlan: 'Unsupported plan selected.',
        inactiveLicense: 'Your license is inactive. Update billing to continue.',
    },
    portal: {
        settings: {
            title: 'Settings',
            dashboard: 'Dashboard',
            logOut: 'Log Out',
            account: {
                title: 'Account',
                email: 'Email',
                emailLogin: 'Email Login',
                password: 'Password',
                passwordPlaceholder: '••••••••••••',
                phone: 'Phone',
            },
            family: {
                title: 'Family',
                manageChildren: 'Manage Children',
                born: 'Born',
                noTeams: 'No active team memberships',
                guardians: 'Guardians & Permissions',
                you: 'You',
                familyAdmin: 'Family Admin',
                owner: 'Owner',
                viewOnly: 'View Only',
                rsvp: 'RSVP',
                noGuardians: 'No other guardians added.',
            },
            notifications: {
                title: 'Notifications',
                scheduleChanges: 'Schedule changes',
                announcements: 'Announcements',
                rsvpReminders: 'RSVP reminders',
                paymentReminders: 'Payment reminders',
                tryoutUpdates: 'Tryout updates',
                emergencyAlerts: 'Emergency alerts',
                quietHours: 'Quiet hours',
            },
            payments: {
                title: 'Payments',
                cardEnding: '•••• {{last4}}',
                expires: 'Expires {{date}}',
                default: 'Default',
                addPaymentMethod: '+ Add Payment Method',
                billingHistory: 'Billing History',
                downloadReceipts: 'Download All Receipts',
            },
            support: {
                title: 'Support',
                helpCenter: 'Help Center',
                contactSupport: 'Contact Support',
                reportProblem: 'Report a Problem',
            },
            legal: {
                title: 'Legal',
                termsOfService: 'Terms of Service',
                privacyPolicy: 'Privacy Policy',
                refundPolicy: 'Refund Policy',
                version: 'Version {{version}} (Build {{build}})',
            },
            language: {
                title: 'Language',
                english: 'English',
                spanish: 'Spanish',
                description: 'Choose your preferred language',
            },
        },
    },
}

/**
 * Spanish translations - must match the `en` schema.
 * TypeScript will enforce this via the type annotation below.
 */
export const es: typeof en = {
    common: {
        loading: 'Cargando...',
        error: 'Error',
        retry: 'Reintentar',
        save: 'Guardar',
        cancel: 'Cancelar',
        close: 'Cerrar',
        goBack: 'Volver',
        viewDetails: 'Ver Detalles',
        edit: 'Editar',
        remove: 'Eliminar',
        add: 'Agregar',
        invite: 'Invitar',
        change: 'Cambiar',
        manage: 'Administrar',
        download: 'Descargar',
    },
    license: {
        statusLabel: 'Estado de Licencia',
        planLabel: 'Plan',
        renewalDate: 'Se Renueva El',
        trialEnds: 'Prueba Termina',
        graceEnds: 'Gracia Termina',
        planStarter: 'Inicial',
        planStandard: 'Estándar',
        planPro: 'Pro',
        status: {
            trial: 'Prueba',
            active: 'Activo',
            past_due: 'Vencido',
            canceled: 'Cancelado',
            expired: 'Expirado',
        },
        badge: {
            trialTooltip: 'La prueba termina el {{date}}',
            activeTooltip: 'Activo hasta {{date}}',
            pastDueTooltip: 'Pago fallido. Gracia hasta {{date}}',
            canceledTooltip: 'Se cancela el {{date}}',
            expiredTooltip: 'Suscripción expirada',
        },
        warning: {
            trial: 'Su prueba termina el {{date}}. Agregue facturación para continuar.',
            pastDue: 'Pago fallido. Actualice la facturación antes del {{date}} para evitar interrupciones.',
            canceled: 'La suscripción se cancela el {{date}}. Renueve para mantenerse activo.',
            expired: 'Su licencia expiró. Actualice la facturación para restaurar el acceso.',
        },
        gate: {
            title: 'Licencia Requerida',
            message: 'La licencia de su organización está inactiva. Actualice la facturación para continuar.',
            action: 'Ir a Facturación',
        },
    },
    billing: {
        pageTitle: 'Licencia y Facturación',
        planSelectionTitle: 'Elija Su Plan',
        manageBilling: 'Administrar Facturación',
        upgradePlan: 'Mejorar Plan',
        downgradePlan: 'Reducir Plan',
        changePlan: 'Cambiar Plan',
        currentPlan: 'Plan Actual',
        selectPlan: 'Seleccionar Plan',
        continueToCheckout: 'Continuar al Pago',
        checkoutSuccessTitle: 'Pago Exitoso',
        checkoutSuccessBody: 'La licencia de su organización está activa. Redirigiendo a facturación...',
        checkoutCancelTitle: 'Pago Cancelado',
        checkoutCancelBody: 'Canceló el pago. Puede intentarlo en cualquier momento.',
        viewBillingHistory: 'Ver Historial de Facturación',
        statusSectionTitle: 'Estado',
        detailsSectionTitle: 'Detalles',
        actionsSectionTitle: 'Acciones',
        renewalDate: 'Fecha de Renovación',
        trialEnds: 'Prueba Termina',
        graceEnds: 'Gracia Termina',
        planLabel: 'Plan',
        pricePerYear: '{{price}} / año',
        portalCta: 'Abrir Portal del Cliente',
        checkoutCta: 'Iniciar Pago',
        errorLoading: 'No se pudieron cargar los detalles de facturación.',
        errorCreatingSession: 'No se pudo iniciar el pago. Inténtelo de nuevo.',
        errorCreatingPortal: 'No se pudo abrir el portal del cliente.',
        billingHistoryEmpty: 'Aún no hay eventos de facturación.',
    },
    plans: {
        starter: {
            name: 'Inicial',
            price: '$299',
            description: 'Herramientas básicas de programación y listas para programas pequeños.',
        },
        standard: {
            name: 'Estándar',
            price: '$599',
            description: 'Mensajería ampliada, pagos e informes.',
        },
        pro: {
            name: 'Pro',
            price: '$999',
            description: 'Suite completa con viajes, pruebas e información avanzada.',
        },
        features: {
            scheduling: 'Programación y Calendario',
            rosters: 'Listas de Equipos y Asistencia',
            messaging: 'Mensajería y Anuncios',
            payments: 'Pagos y Facturas',
            uniforms: 'Pedido de Uniformes',
            travel: 'Planificación de Viajes',
            tryouts: 'Gestión de Pruebas',
            reporting: 'Informes y Análisis',
            support: 'Soporte Prioritario',
        },
    },
    checkout: {
        success: 'Éxito',
        cancel: 'Cancelado',
        redirecting: 'Redirigiendo...',
        returnToBilling: 'Volver a Facturación',
    },
    errors: {
        missingOrganization: 'Se requiere organización para cargar facturación.',
        unsupportedPlan: 'Plan seleccionado no compatible.',
        inactiveLicense: 'Su licencia está inactiva. Actualice la facturación para continuar.',
    },
    portal: {
        settings: {
            title: 'Configuración',
            dashboard: 'Panel',
            logOut: 'Cerrar Sesión',
            account: {
                title: 'Cuenta',
                email: 'Correo Electrónico',
                emailLogin: 'Inicio de Sesión por Correo',
                password: 'Contraseña',
                passwordPlaceholder: '••••••••••••',
                phone: 'Teléfono',
            },
            family: {
                title: 'Familia',
                manageChildren: 'Administrar Niños',
                born: 'Nacido',
                noTeams: 'Sin membresías de equipo activas',
                guardians: 'Tutores y Permisos',
                you: 'Usted',
                familyAdmin: 'Administrador Familiar',
                owner: 'Propietario',
                viewOnly: 'Solo Ver',
                rsvp: 'RSVP',
                noGuardians: 'No se agregaron otros tutores.',
            },
            notifications: {
                title: 'Notificaciones',
                scheduleChanges: 'Cambios de horario',
                announcements: 'Anuncios',
                rsvpReminders: 'Recordatorios de RSVP',
                paymentReminders: 'Recordatorios de pago',
                tryoutUpdates: 'Actualizaciones de pruebas',
                emergencyAlerts: 'Alertas de emergencia',
                quietHours: 'Horas tranquilas',
            },
            payments: {
                title: 'Pagos',
                cardEnding: '•••• {{last4}}',
                expires: 'Vence {{date}}',
                default: 'Predeterminado',
                addPaymentMethod: '+ Agregar Método de Pago',
                billingHistory: 'Historial de Facturación',
                downloadReceipts: 'Descargar Todos los Recibos',
            },
            support: {
                title: 'Soporte',
                helpCenter: 'Centro de Ayuda',
                contactSupport: 'Contactar Soporte',
                reportProblem: 'Reportar un Problema',
            },
            legal: {
                title: 'Legal',
                termsOfService: 'Términos de Servicio',
                privacyPolicy: 'Política de Privacidad',
                refundPolicy: 'Política de Reembolso',
                version: 'Versión {{version}} (Build {{build}})',
            },
            language: {
                title: 'Idioma',
                english: 'Inglés',
                spanish: 'Español',
                description: 'Elija su idioma preferido',
            },
        },
    },
}

/**
 * All translations indexed by locale.
 * Add new locales here as needed.
 */
export const translations = {
    en,
    es,
} as const

export type Locale = keyof typeof translations
export type Translations = typeof en
