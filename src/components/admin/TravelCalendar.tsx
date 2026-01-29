import React from 'react'
import '../../styles/ios-events.css'
import type { TravelPlanWithTeam } from './TravelList'
import type { TravelPlanStatus } from '../../types/travelManagement'

interface TravelCalendarProps {
    plans: TravelPlanWithTeam[]
    currentDate: Date
    onDateChange: (date: Date) => void
    onPlanClick: (plan: TravelPlanWithTeam) => void
}

const STATUS_CLASS: Record<TravelPlanStatus, string> = {
    draft: 'default',
    published: 'game',
    cancelled: 'ios-event-cancelled',
}

export default function TravelCalendar({ plans, currentDate, onDateChange, onPlanClick }: TravelCalendarProps) {
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const days: (Date | null)[] = []
        for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
        return days
    }

    const isToday = (date: Date) =>
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear()

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()

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
    const goToToday = () => onDateChange(new Date())

    const days = getDaysInMonth(currentDate)

    return (
        <div className="ios-calendar-container">
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
                <button className="ios-calendar-today-button" onClick={goToToday}>Today</button>
            </div>
            <div className="ios-calendar-grid">
                <div className="ios-calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="ios-calendar-weekday">{day}</div>
                    ))}
                </div>
                <div className="ios-calendar-days">
                    {days.map((day, index) => {
                        if (!day) return <div key={`empty-${index}`} className="ios-calendar-day empty" />
                        const dayPlans = plans.filter((p) => isSameDay(new Date(p.start_date), day))
                        const isCurrentDay = isToday(day)
                        return (
                            <div key={index} className={`ios-calendar-day ${isCurrentDay ? 'today' : ''}`} onClick={() => onDateChange(day)}>
                                <div className="ios-calendar-day-number">{day.getDate()}</div>
                                <div className="ios-calendar-events">
                                    {dayPlans.slice(0, 3).map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`ios-calendar-event-pill ${STATUS_CLASS[plan.status]}`}
                                            onClick={(e) => { e.stopPropagation(); onPlanClick(plan) }}
                                            style={{ opacity: plan.status === 'cancelled' ? 0.5 : 1, textDecoration: plan.status === 'cancelled' ? 'line-through' : 'none' }}
                                        >
                                            {plan.title}
                                        </div>
                                    ))}
                                    {dayPlans.length > 3 && <div className="ios-calendar-more">+{dayPlans.length - 3} more</div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
