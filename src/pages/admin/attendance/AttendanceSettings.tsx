
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../../components/platformAdmin'
import { useUserContext } from '../../../hooks/useUserContext'
import { getAttendanceSettings, updateAttendanceSettings } from '../../../data/services/attendanceService'
import type { AttendanceSettings } from '../../../types/attendance'
import { showSuccess, showError } from '../../../utils/toast'

export default function AttendanceSettingsTab() {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { context, isReady } = useUserContext()

  useEffect(() => {
    if (!isReady) return
    getAttendanceSettings(context).then(res => {
        if (res.data) setSettings(res.data as AttendanceSettings)
        setLoading(false)
    })
  }, [isReady, context])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const { error } = await updateAttendanceSettings(context, settings)
      if (error) {
        showError(error.message || 'Failed to save attendance settings')
      } else {
        showSuccess('Attendance settings updated successfully!')
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save attendance settings')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (key: keyof AttendanceSettings) => {
    if (!settings) return
    setSettings({ ...settings, [key]: !settings[key] })
  }

  if (loading) return <div>Loading settings...</div>
  if (!settings) return <div>Error loading settings</div>

  return (
    <div className="oa-space-y-4">
      <Card>
        <CardHeader><CardTitle>General Configuration</CardTitle></CardHeader>
        <CardContent className="oa-space-y-4">
             <div className="oa-flex oa-items-center oa-justify-between">
             <label>Enable Coach Reminders</label>
             <input type="checkbox" checked={settings.enable_coach_reminders} onChange={() => toggle('enable_coach_reminders')} />
           </div>
           
           <div className="oa-flex oa-items-center oa-justify-between">
             <label>Submission Deadline (Hours)</label>
             <input 
                type="number" 
                className="oa-input oa-w-24" 
                value={settings.submission_deadline_hours}
                onChange={(e) => setSettings({...settings, submission_deadline_hours: parseInt(e.target.value) || 0})}
             />
           </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Required Events</CardTitle></CardHeader>
        <CardContent className="oa-space-y-4">
            <div className="oa-flex oa-items-center oa-justify-between">
             <label>Practices</label>
             <input type="checkbox" checked={settings.required_for_practice} onChange={() => toggle('required_for_practice')} />
           </div>
           
           <div className="oa-flex oa-items-center oa-justify-between">
             <label>Games</label>
             <input type="checkbox" checked={settings.required_for_game} onChange={() => toggle('required_for_game')} />
           </div>

           <div className="oa-flex oa-items-center oa-justify-between">
             <label>Meetings</label>
             <input type="checkbox" checked={settings.required_for_meeting} onChange={() => toggle('required_for_meeting')} />
           </div>
        </CardContent>
      </Card>
      
      <div className="oa-flex oa-justify-end">
        <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
