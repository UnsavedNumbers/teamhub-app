
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../../components/platformAdmin'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendanceSettings, updateAttendanceSettings } from '../../../data/services/attendanceService'
import type { AttendanceSettings } from '../../../types/attendance'

export default function AttendanceSettingsTab() {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { context, isReady } = useUserContext()

  useEffect(() => {
    if (!isReady) return
    getAttendanceSettings(context).then(res => {
        if (res.data) setSettings(res.data)
        setLoading(false)
    })
  }, [isReady, context])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    await updateAttendanceSettings(context, settings)
    setSaving(false)
  }

  const toggle = (key: keyof AttendanceSettings) => {
    if (!settings) return
    setSettings({ ...settings, [key]: !settings[key] })
  }

  if (loading) return <div>Loading settings...</div>
  if (!settings) return <div>Error loading settings</div>

  return (
    <div className="pa-space-y-4">
      <Card>
        <CardHeader><CardTitle>General Configuration</CardTitle></CardHeader>
        <CardContent className="pa-space-y-4">
           <div className="pa-flex pa-items-center pa-justify-between">
             <label>Enable Coach Reminders</label>
             <input type="checkbox" checked={settings.reminder_enabled} onChange={() => toggle('reminder_enabled')} />
           </div>
           
           <div className="pa-flex pa-items-center pa-justify-between">
             <label>Lock Attendance Record After (hours)</label>
             <input 
                type="number" 
                className="pa-input pa-w-24" 
                value={settings.lock_after_hours}
                onChange={(e) => setSettings({...settings, lock_after_hours: parseInt(e.target.value) || 0})}
             />
           </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Required Events</CardTitle></CardHeader>
        <CardContent className="pa-space-y-4">
            <div className="pa-flex pa-items-center pa-justify-between">
             <label>Practices</label>
             <input type="checkbox" checked={settings.required_for_practice} onChange={() => toggle('required_for_practice')} />
           </div>
           
           <div className="pa-flex pa-items-center pa-justify-between">
             <label>Games</label>
             <input type="checkbox" checked={settings.required_for_game} onChange={() => toggle('required_for_game')} />
           </div>

           <div className="pa-flex pa-items-center pa-justify-between">
             <label>Meetings</label>
             <input type="checkbox" checked={settings.required_for_meeting} onChange={() => toggle('required_for_meeting')} />
           </div>
        </CardContent>
      </Card>
      
      <div className="pa-flex pa-justify-end">
        <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
