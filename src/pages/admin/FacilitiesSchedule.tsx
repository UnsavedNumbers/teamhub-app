/**
 * Facilities Schedule Page
 *
 * Calendar view for scheduling facility reservations
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useT } from '../../i18n/useI18n'
import { getErrorMessage } from '../../utils/errorUtils'
import { showSuccess, showError } from '../../utils/toast'
import { getLink } from '../../utils/routes'
import { AdminPageHeader, Button, Card, Select } from '../../components/admin'
import { useFeatureGate } from '../../lib/featureGate'
import {
    getFacilities,
    getResources,
    getReservations,
    getBlackouts,
    deleteReservation,
} from '../../data/services/facilitiesService'
import { getCustomers } from '../../data/services/customerService'
import type { Facility, FacilityResource, FacilityReservation, FacilityBlackout } from '../../types/facilities'
import type { Customer } from '../../types/customers'
import ReservationFormSlideOver from '../../components/admin/ReservationFormSlideOver'
import '../../styles/orgAdmin.css'

type CalendarView = 'day' | 'week' | 'month' | 'agenda'

export default function FacilitiesSchedule() {
    const [searchParams] = useSearchParams()
    const facilityFilter = searchParams.get('facility')

    const [view, setView] = useState<CalendarView>('day')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [_resources, setResources] = useState<FacilityResource[]>([])
    const [reservations, setReservations] = useState<FacilityReservation[]>([])
    const [_blackouts, setBlackouts] = useState<FacilityBlackout[]>([])
    const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>(
        facilityFilter ? [facilityFilter] : []
    )
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const { allowed: canUseCustomers } = useFeatureGate('facilities_schedule')

    // Forms
    const [reservationFormOpen, setReservationFormOpen] = useState(false)
    const [reservationFormEditing, setReservationFormEditing] = useState<FacilityReservation | null>(null)
    const [reservationFormInitialStartAt, setReservationFormInitialStartAt] = useState<string | null>(null)
    const [reservationFormInitialEndAt, setReservationFormInitialEndAt] = useState<string | null>(null)
    const [deleteReservationDialog, setDeleteReservationDialog] = useState<FacilityReservation | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

    const { context, isReady } = useUserContext()
    const t = useT()

    // Load facilities and customers
    useEffect(() => {
        if (!isReady || !context.orgId) return

        const loadData = async () => {
            const [facilitiesResult, customersResult] = await Promise.all([
                getFacilities(context.orgId),
                canUseCustomers ? getCustomers(context.orgId) : Promise.resolve({ data: [], error: null }),
            ])
            if (facilitiesResult.data) {
                setFacilities(facilitiesResult.data)
            }
            if (customersResult.data) {
                setCustomers(customersResult.data)
            }
        }

        loadData()
    }, [isReady, context.orgId, canUseCustomers])

    // Load resources for selected facilities
    useEffect(() => {
        if (!isReady || !context.orgId || selectedFacilityIds.length === 0) {
            setResources([])
            return
        }

        const loadResources = async () => {
            const result = await getResources(context.orgId, {
                facility_id: selectedFacilityIds[0], // For now, use first facility
            })
            if (result.data) {
                setResources(result.data)
            }
        }

        loadResources()
    }, [isReady, context.orgId, selectedFacilityIds])

    // Load reservations and blackouts
    const fetchScheduleData = useCallback(async () => {
        if (!isReady || !context.orgId) return

        setLoading(true)
        try {
            // Calculate date range based on view
            let start: Date
            let end: Date
            
            const year = currentDate.getFullYear()
            const month = currentDate.getMonth()
            const day = currentDate.getDate()
            
            if (view === 'day') {
                start = new Date(year, month, day, 0, 0, 0)
                end = new Date(year, month, day, 23, 59, 59)
            } else if (view === 'week') {
                // Get start of week (Sunday)
                const dayOfWeek = currentDate.getDay()
                start = new Date(year, month, day - dayOfWeek, 0, 0, 0)
                end = new Date(year, month, day - dayOfWeek + 6, 23, 59, 59)
            } else if (view === 'month') {
                start = new Date(year, month, 1, 0, 0, 0)
                end = new Date(year, month + 1, 0, 23, 59, 59)
            } else {
                // agenda: show current month
                start = new Date(year, month, 1, 0, 0, 0)
                end = new Date(year, month + 1, 0, 23, 59, 59)
            }

            const [reservationsResult, blackoutsResult] = await Promise.all([
                getReservations({
                    org_id: context.orgId,
                    facility_ids: selectedFacilityIds.length > 0 ? selectedFacilityIds : undefined,
                    customer_id: selectedCustomerId || undefined,
                    start: start.toISOString(),
                    end: end.toISOString(),
                }),
                selectedFacilityIds.length > 0
                    ? getBlackouts(context.orgId, selectedFacilityIds[0])
                    : Promise.resolve({ data: [], error: null, isEmpty: false }),
            ])

            if (reservationsResult.data) {
                setReservations(reservationsResult.data)
            }
            if (blackoutsResult.data) {
                setBlackouts(blackoutsResult.data)
            }
        } catch (err) {
            console.error('Error loading schedule data:', err)
            showError(getErrorMessage(err) || t('common.error.loadFailed'))
        } finally {
            setLoading(false)
        }
    }, [isReady, context.orgId, currentDate, selectedFacilityIds, selectedCustomerId, view, t])

    useEffect(() => {
        fetchScheduleData()
    }, [fetchScheduleData])

    // Handle Escape key to close dialogs
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (deleteReservationDialog) {
                    setDeleteReservationDialog(null)
                } else if (reservationFormOpen && !actionLoading) {
                    setReservationFormOpen(false)
                    setReservationFormEditing(null)
                    setReservationFormInitialStartAt(null)
                    setReservationFormInitialEndAt(null)
                }
            }
        }
        
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [deleteReservationDialog, reservationFormOpen, actionLoading])

    const handleCreateReservation = () => {
        setReservationFormEditing(null)
        setReservationFormInitialStartAt(null)
        setReservationFormInitialEndAt(null)
        setReservationFormOpen(true)
    }

    const handleReservationClick = (reservation: FacilityReservation) => {
        setReservationFormEditing(reservation)
        setReservationFormOpen(true)
    }

    const handleDeleteReservation = async () => {
        if (!deleteReservationDialog) return

        setActionLoading(true)
        try {
            const result = await deleteReservation(deleteReservationDialog.id)
            if (result.error) {
                showError(result.error.message || t('admin.facilities.errors.deleteReservationFailed'))
            } else {
                showSuccess(t('admin.facilities.success.reservationDeleted'))
                setDeleteReservationDialog(null)
                fetchScheduleData()
            }
        } catch (err) {
            showError(getErrorMessage(err) || t('admin.facilities.errors.deleteReservationFailed'))
        } finally {
            setActionLoading(false)
        }
    }

    const navigateDate = (direction: 'prev' | 'next' | 'today') => {
        const newDate = new Date(currentDate)
        if (direction === 'today') {
            setCurrentDate(new Date())
        } else if (direction === 'prev') {
            if (view === 'day') {
                newDate.setDate(newDate.getDate() - 1)
            } else if (view === 'week') {
                newDate.setDate(newDate.getDate() - 7)
            } else {
                newDate.setMonth(newDate.getMonth() - 1)
            }
            setCurrentDate(newDate)
        } else {
            if (view === 'day') {
                newDate.setDate(newDate.getDate() + 1)
            } else if (view === 'week') {
                newDate.setDate(newDate.getDate() + 7)
            } else {
                newDate.setMonth(newDate.getMonth() + 1)
            }
            setCurrentDate(newDate)
        }
    }

    // Get reservations for a date range
    const getReservationsForDateRange = (startDate: Date, endDate: Date): FacilityReservation[] => {
        const start = startDate.getTime()
        const end = endDate.getTime()
        return reservations.filter((r) => {
            const rStart = new Date(r.start_at).getTime()
            const rEnd = new Date(r.end_at).getTime()
            return rStart <= end && rEnd >= start
        })
    }

    // Simple calendar rendering
    const renderCalendar = () => {
        if (view === 'day') {
            const dayStart = new Date(currentDate)
            dayStart.setHours(0, 0, 0, 0)
            const dayEnd = new Date(currentDate)
            dayEnd.setHours(23, 59, 59, 999)
            const dayReservations = getReservationsForDateRange(dayStart, dayEnd)
            
            const hours = Array.from({ length: 24 }, (_, i) => i)
            
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {hours.map((hour) => {
                        const hourStart = new Date(currentDate)
                        hourStart.setHours(hour, 0, 0, 0)
                        const hourEnd = new Date(currentDate)
                        hourEnd.setHours(hour + 1, 0, 0, 0)
                        const hourReservations = dayReservations.filter((r) => {
                            const rStart = new Date(r.start_at)
                            const rEnd = new Date(r.end_at)
                            return rStart < hourEnd && rEnd > hourStart
                        })
                        
                        return (
                            <div
                                key={hour}
                                style={{
                                    display: 'flex',
                                    borderBottom: '1px solid var(--org-border-default)',
                                    minHeight: '60px',
                                    padding: '8px',
                                }}
                            >
                                <div
                                    style={{
                                        width: '80px',
                                        fontSize: '14px',
                                        color: 'var(--org-text-secondary)',
                                        fontWeight: '500',
                                    }}
                                >
                                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                </div>
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        const defaultStart = new Date(currentDate)
                                        defaultStart.setHours(hour, 0, 0, 0)
                                        const defaultEnd = new Date(currentDate)
                                        defaultEnd.setHours(hour + 1, 0, 0, 0)
                                        setReservationFormEditing(null)
                                        setReservationFormInitialStartAt(defaultStart.toISOString())
                                        setReservationFormInitialEndAt(defaultEnd.toISOString())
                                        setReservationFormOpen(true)
                                    }}
                                >
                                    {hourReservations.map((reservation) => (
                                        <div
                                            key={reservation.id}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleReservationClick(reservation)
                                            }}
                                            style={{
                                                padding: '8px',
                                                background: 'var(--org-btn-primary-bg)',
                                                color: 'var(--org-btn-primary-text)',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div style={{ fontWeight: '600' }}>{reservation.title}</div>
                                            <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                                {new Date(reservation.start_at).toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                })} - {new Date(reservation.end_at).toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                    {dayReservations.length === 0 && (
                        <Card className="oa-border-2 oa-border-dashed">
                            <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                                <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>event_available</span>
                                <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                                    <h3 className="oa-h3 oa-mb-0">{t('admin.facilities.schedule.noReservations')}</h3>
                                    <p className="oa-body-m oa-text-muted oa-mb-4">Create reservations to schedule facility usage</p>
                                    <Button variant="primary" onClick={handleCreateReservation} icon="add">
                                        {t('admin.facilities.schedule.createReservation')}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )
        }
        
        if (view === 'week') {
            const dayOfWeek = currentDate.getDay()
            const weekStart = new Date(currentDate)
            weekStart.setDate(currentDate.getDate() - dayOfWeek)
            weekStart.setHours(0, 0, 0, 0)
            
            const weekDays = Array.from({ length: 7 }, (_, i) => {
                const date = new Date(weekStart)
                date.setDate(weekStart.getDate() + i)
                return date
            })
            
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '80px repeat(7, 1fr)',
                            gap: '8px',
                            borderBottom: '2px solid var(--org-border-default)',
                            paddingBottom: '8px',
                        }}
                    >
                        <div></div>
                        {weekDays.map((date) => (
                            <div
                                key={date.toISOString()}
                                style={{
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'var(--org-text-secondary)',
                                }}
                            >
                                <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                <div
                                    style={{
                                        fontSize: '18px',
                                        color: date.toDateString() === new Date().toDateString() ? 'var(--org-btn-primary-bg)' : 'var(--org-text-primary)',
                                    }}
                                >
                                    {date.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Array.from({ length: 24 }, (_, hour) => (
                            <div
                                key={hour}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '80px repeat(7, 1fr)',
                                    gap: '8px',
                                    minHeight: '50px',
                                    borderBottom: '1px solid var(--org-border-default)',
                                    padding: '4px 0',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '12px',
                                        color: 'var(--org-text-secondary)',
                                        paddingRight: '8px',
                                        textAlign: 'right',
                                    }}
                                >
                                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                </div>
                                {weekDays.map((date) => {
                                    const dayStart = new Date(date)
                                    dayStart.setHours(hour, 0, 0, 0)
                                    const dayEnd = new Date(date)
                                    dayEnd.setHours(hour + 1, 0, 0, 0)
                                    const hourReservations = reservations.filter((r) => {
                                        const rStart = new Date(r.start_at)
                                        const rEnd = new Date(r.end_at)
                                        const rDateStr = rStart.toDateString()
                                        return rDateStr === date.toDateString() && rStart < dayEnd && rEnd > dayStart
                                    })
                                    
                                    return (
                                        <div
                                            key={`${date.toISOString()}-${hour}`}
                                            style={{
                                                position: 'relative',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                                const defaultStart = new Date(date)
                                                defaultStart.setHours(hour, 0, 0, 0)
                                                const defaultEnd = new Date(date)
                                                defaultEnd.setHours(hour + 1, 0, 0, 0)
                                                setReservationFormEditing(null)
                                                setReservationFormInitialStartAt(defaultStart.toISOString())
                                                setReservationFormInitialEndAt(defaultEnd.toISOString())
                                                setReservationFormOpen(true)
                                            }}
                                        >
                                            {hourReservations.map((reservation) => (
                                                <div
                                                    key={reservation.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleReservationClick(reservation)
                                                    }}
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: 'var(--org-btn-primary-bg)',
                                                        color: 'var(--org-btn-primary-text)',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        marginBottom: '2px',
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    title={reservation.title}
                                                >
                                                    {reservation.title}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                    {reservations.length === 0 && (
                        <Card className="oa-border-2 oa-border-dashed">
                            <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                                <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>event_available</span>
                                <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                                    <h3 className="oa-h3 oa-mb-0">{t('admin.facilities.schedule.noReservations')}</h3>
                                    <p className="oa-body-m oa-text-muted oa-mb-4">Create reservations to schedule facility usage</p>
                                    <Button variant="primary" onClick={handleCreateReservation} icon="add">
                                        {t('admin.facilities.schedule.createReservation')}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )
        }
        
        if (view === 'agenda') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reservations.map((reservation) => (
                        <div
                            key={reservation.id}
                            onClick={() => handleReservationClick(reservation)}
                            style={{
                                padding: '16px',
                                border: '1px solid var(--org-border-default)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: 'var(--org-surface-card)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                                        {reservation.title}
                                    </h4>
                                    <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--org-text-secondary)' }}>
                                        {reservation.resource?.name || 'Unknown Resource'}
                                    </p>
                                    <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--org-text-secondary)' }}>
                                        {new Date(reservation.start_at).toLocaleString()} -{' '}
                                        {new Date(reservation.end_at).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setDeleteReservationDialog(reservation)
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--pa-danger)',
                                    }}
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                    {reservations.length === 0 && (
                        <Card className="oa-border-2 oa-border-dashed">
                            <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
                                <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>event_available</span>
                                <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
                                    <h3 className="oa-h3 oa-mb-0">{t('admin.facilities.schedule.noReservations')}</h3>
                                    <p className="oa-body-m oa-text-muted oa-mb-4">Create reservations to schedule facility usage</p>
                                    <Button variant="primary" onClick={handleCreateReservation} icon="add">
                                        {t('admin.facilities.schedule.createReservation')}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )
        }

        // Simple month view
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        const days: Array<{ date: Date; reservations: FacilityReservation[] }> = []

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ date: new Date(year, month, -i), reservations: [] })
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day)
            const dayReservations = reservations.filter((r) => {
                const rDate = new Date(r.start_at)
                return (
                    rDate.getFullYear() === year &&
                    rDate.getMonth() === month &&
                    rDate.getDate() === day
                )
            })
            days.push({ date, reservations: dayReservations })
        }

        return (
            <div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '8px',
                        marginBottom: '16px',
                    }}
                >
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                            key={day}
                            style={{
                                padding: '8px',
                                textAlign: 'center',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--org-text-secondary)',
                            }}
                        >
                            {day}
                        </div>
                    ))}
                </div>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '8px',
                    }}
                >
                    {days.map((day, idx) => {
                        const isCurrentMonth = day.date.getMonth() === month
                        const isToday =
                            day.date.toDateString() === new Date().toDateString()

                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    if (isCurrentMonth) {
                                        const defaultStart = new Date(day.date)
                                        defaultStart.setHours(9, 0, 0, 0)
                                        const defaultEnd = new Date(day.date)
                                        defaultEnd.setHours(10, 0, 0, 0)
                                        setReservationFormEditing(null)
                                        setReservationFormInitialStartAt(defaultStart.toISOString())
                                        setReservationFormInitialEndAt(defaultEnd.toISOString())
                                        setReservationFormOpen(true)
                                    }
                                }}
                                style={{
                                    minHeight: '100px',
                                    padding: '8px',
                                    border: '1px solid var(--org-border-default)',
                                    borderRadius: '4px',
                                    background: isCurrentMonth
                                        ? 'var(--org-surface-card)'
                                        : 'var(--org-surface-default)',
                                    opacity: isCurrentMonth ? 1 : 0.5,
                                    cursor: isCurrentMonth ? 'pointer' : 'default',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: isToday ? '600' : '400',
                                        color: isToday ? 'var(--org-btn-primary-bg)' : 'var(--org-text-primary)',
                                        marginBottom: '4px',
                                    }}
                                >
                                    {day.date.getDate()}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {day.reservations.slice(0, 3).map((reservation) => (
                                        <div
                                            key={reservation.id}
                                            onClick={() => handleReservationClick(reservation)}
                                            style={{
                                                padding: '4px 8px',
                                                background: 'var(--org-btn-primary-bg)',
                                                color: 'var(--org-btn-primary-text)',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                cursor: 'pointer',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                            title={reservation.title}
                                        >
                                            {reservation.title}
                                        </div>
                                    ))}
                                    {day.reservations.length > 3 && (
                                        <div
                                            style={{
                                                fontSize: '11px',
                                                color: 'var(--org-text-secondary)',
                                                padding: '4px',
                                            }}
                                        >
                                            +{day.reservations.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div>
            <AdminPageHeader
                title={t('admin.facilities.schedule.title')}
                subtitle={t('admin.facilities.schedule.subtitle')}
                breadcrumbs={[
                    { label: t('admin.facilities.title'), path: getLink('admin.facilities.list') },
                    facilityFilter && facilities.find(f => f.id === facilityFilter) 
                        ? { label: facilities.find(f => f.id === facilityFilter)!.name, path: getLink('admin.facilities.detail', { id: facilityFilter }) }
                        : null,
                    { label: t('admin.facilities.schedule.title') },
                ].filter(Boolean) as Array<{ label: string; path?: string }>}
                actions={
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <Link to={getLink('admin.facilities.list')} style={{ textDecoration: 'none' }}>
                            <Button variant="ghost" icon="arrow_back">
                                {t('admin.facilities.backToFacilities')}
                            </Button>
                        </Link>
                        <Button variant="secondary" onClick={() => navigateDate('today')}>
                            Today
                        </Button>
                        <Button variant="primary" onClick={handleCreateReservation} icon="add">
                            {t('admin.facilities.schedule.createReservation')}
                        </Button>
                    </div>
                }
            />

            {/* View Selector */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '24px',
                    borderBottom: '1px solid var(--org-border-default)',
                }}
            >
                {(['day', 'week', 'month', 'agenda'] as CalendarView[]).map((v) => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        style={{
                            padding: '8px 16px',
                            border: 'none',
                            background: 'transparent',
                            borderBottom: `2px solid ${view === v ? 'var(--org-btn-primary-bg)' : 'transparent'}`,
                            color: view === v ? 'var(--org-btn-primary-bg)' : 'var(--org-text-secondary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: view === v ? '600' : '400',
                            textTransform: 'capitalize',
                        }}
                    >
                        {v}
                    </button>
                ))}
            </div>

            {/* Date Navigation */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                }}
            >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button variant="ghost" onClick={() => navigateDate('prev')} icon="chevron_left">
                        Prev
                    </Button>
                    <div style={{ fontSize: '18px', fontWeight: '600', minWidth: '200px', textAlign: 'center' }}>
                        {view === 'day'
                            ? currentDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'long',
                                  day: 'numeric',
                                  year: 'numeric',
                              })
                            : view === 'week'
                            ? (() => {
                                  const dayOfWeek = currentDate.getDay()
                                  const weekStart = new Date(currentDate)
                                  weekStart.setDate(currentDate.getDate() - dayOfWeek)
                                  const weekEnd = new Date(weekStart)
                                  weekEnd.setDate(weekStart.getDate() + 6)
                                  return `${weekStart.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                  })} - ${weekEnd.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                  })}`
                              })()
                            : currentDate.toLocaleDateString('en-US', {
                                  month: 'long',
                                  year: 'numeric',
                              })}
                    </div>
                    <Button variant="ghost" onClick={() => navigateDate('next')} icon="chevron_right">
                        Next
                    </Button>
                </div>
            </div>

            {/* Facility Filter */}
            {facilities.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                        Filter by Facility
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {facilities.map((facility) => (
                            <button
                                key={facility.id}
                                onClick={() => {
                                    if (selectedFacilityIds.includes(facility.id)) {
                                        setSelectedFacilityIds(selectedFacilityIds.filter((id) => id !== facility.id))
                                    } else {
                                        setSelectedFacilityIds([...selectedFacilityIds, facility.id])
                                    }
                                }}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    border: `1px solid ${
                                        selectedFacilityIds.includes(facility.id)
                                            ? 'var(--org-btn-primary-bg)'
                                            : 'var(--org-border-default)'
                                    }`,
                                    background: selectedFacilityIds.includes(facility.id)
                                        ? 'var(--org-btn-primary-bg)'
                                        : 'transparent',
                                    color: selectedFacilityIds.includes(facility.id)
                                        ? 'var(--org-btn-primary-text)'
                                        : 'var(--org-text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                }}
                            >
                                {facility.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Customer Filter */}
            {canUseCustomers && customers.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <Select
                        label={t('admin.facilities.schedule.filterByCustomer')}
                        value={selectedCustomerId || ''}
                        onChange={(e) => setSelectedCustomerId(e.target.value || null)}
                        options={[
                            { value: '', label: t('admin.facilities.schedule.allCustomers') },
                            ...customers.map((c) => ({ value: c.id, label: c.name })),
                        ]}
                    />
                </div>
            )}

            {/* Calendar */}
            {loading ? (
                <div style={{ padding: '64px', textAlign: 'center' }}>
                    <span className="material-symbols-outlined oa-spin" style={{ fontSize: '32px' }}>
                        refresh
                    </span>
                    <div style={{ marginTop: '16px', color: 'var(--org-text-secondary)' }}>
                        {t('common.loading')}
                    </div>
                </div>
            ) : (
                renderCalendar()
            )}

            {/* Reservation Form */}
            <ReservationFormSlideOver
                isOpen={reservationFormOpen}
                onClose={() => {
                    setReservationFormOpen(false)
                    setReservationFormEditing(null)
                    setReservationFormInitialStartAt(null)
                    setReservationFormInitialEndAt(null)
                }}
                reservation={reservationFormEditing}
                initialFacilityId={selectedFacilityIds.length === 1 ? selectedFacilityIds[0] : null}
                initialStartAt={reservationFormInitialStartAt}
                initialEndAt={reservationFormInitialEndAt}
                onSaved={() => {
                    setReservationFormOpen(false)
                    setReservationFormEditing(null)
                    setReservationFormInitialStartAt(null)
                    setReservationFormInitialEndAt(null)
                    fetchScheduleData()
                }}
            />

            {/* Delete Dialog */}
            {deleteReservationDialog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.4)',
                    }}
                    onClick={() => setDeleteReservationDialog(null)}
                >
                    <div
                        style={{
                            background: 'var(--org-surface-card)',
                            borderRadius: '8px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '90%',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Delete Reservation?</h3>
                        <p style={{ marginBottom: '24px', color: 'var(--org-text-secondary)' }}>
                            {t('admin.facilities.detail.confirmDeleteReservation')}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Button variant="secondary" onClick={() => setDeleteReservationDialog(null)}>
                                {t('common.cancel')}
                            </Button>
                            <Button variant="danger" onClick={handleDeleteReservation} disabled={actionLoading}>
                                {actionLoading ? t('common.deleting') : t('common.delete')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
