import React from 'react'
import '../../styles/ios-events.css'
import type { CalendarEvent, EventType } from '../../types/calendar'

interface EventsCalendarProps {
    events: CalendarEvent[]
    currentDate: Date
    onDateChange: (date: Date) => void
    onEventClick: (event: CalendarEvent) => void
}

export default function EventsCalendar({
    events,
    currentDate,
    onDateChange,
    onEventClick,
}: EventsCalendarProps) {
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const days = []

        // Add empty days for padding before first day of month
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null)
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i))
        }
        return days
    }

    const isToday = (date: Date) => {
        const today = new Date()
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        )
    }

    const isSameDay = (d1: Date, d2: Date) => {
        return (
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear()
        )
    }

    const getEventTypeClass = (type: EventType): string => {
        switch (type) {
            case 'practice':
                return 'practice'
            case 'game':
                return 'game'
            case 'tournament':
                return 'tournament'
            case 'meeting':
                return 'meeting'
            default:
                return 'default'
        }
    }

    const goToPreviousMonth = () => {
        const newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() - 1)
        onDateChange(newDate)
    }

    const goToNextMonth = () => {
        const newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() + 1)
        onDateChange(newDate)
    }

    const goToToday = () => {
        onDateChange(new Date())
    }

    const days = getDaysInMonth(currentDate)

    return (
        <div className="ios-calendar-container">
            {/* Calendar Header */}
            <div className="ios-calendar-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="ios-calendar-nav-button" onClick={goToPreviousMonth}>
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <h3 className="ios-calendar-month-title">
                        {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </h3>
                    <button className="ios-calendar-nav-button" onClick={goToNextMonth}>
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
                <button className="ios-calendar-today-button" onClick={goToToday}>
                    Today
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="ios-calendar-grid">
                {/* Weekday Headers */}
                <div className="ios-calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="ios-calendar-weekday">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="ios-calendar-days">
                    {days.map((day, index) => {
                        if (!day) {
                            return <div key={`empty-${index}`} className="ios-calendar-day empty" />
                        }

                        const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), day))
                        const isCurrentDay = isToday(day)

                        return (
                            <div
                                key={index}
                                className={`ios-calendar-day ${isCurrentDay ? 'today' : ''}`}
                                onClick={() => onDateChange(day)}
                            >
                                {/* Day Number */}
                                <div className="ios-calendar-day-number">{day.getDate()}</div>

                                {/* Events */}
                                <div className="ios-calendar-events">
                                    {dayEvents.slice(0, 3).map((event) => (
                                        <div
                                            key={event.id}
                                            className={`ios-calendar-event-pill ${getEventTypeClass(event.type)}`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEventClick(event)
                                            }}
                                            style={{
                                                opacity: event.is_cancelled ? 0.5 : 1,
                                                textDecoration: event.is_cancelled ? 'line-through' : 'none',
                                            }}
                                        >
                                            {new Date(event.start_time).toLocaleTimeString(undefined, {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}{' '}
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="ios-calendar-more">+{dayEvents.length - 3} more</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
