
import { useState } from 'react'
import { AdminPageHeader } from '../../components/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/platformAdmin'
import AttendanceOverview from './attendance/AttendanceOverview'
import AttendanceEvents from './attendance/AttendanceEvents'
import AttendancePeople from './attendance/AttendancePeople'
import AttendanceReports from './attendance/AttendanceReports'
import AttendanceSettings from './attendance/AttendanceSettings'
import '../../styles/orgAdmin.css'

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="oa-root">
      <AdminPageHeader 
        title="Attendance" 
        subtitle="Monitor and manage attendance across your organization"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="oa-tabs">
        <TabsList className="oa-mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AttendanceOverview />
        </TabsContent>

        <TabsContent value="events">
          <AttendanceEvents />
        </TabsContent>
        
        <TabsContent value="people">
          <AttendancePeople />
        </TabsContent>

        <TabsContent value="reports">
          <AttendanceReports />
        </TabsContent>

        <TabsContent value="settings">
          <AttendanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
