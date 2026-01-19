
import { useState } from 'react'
import { AdminPageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/platformAdmin'
import AttendanceOverview from './attendance/AttendanceOverview'
import AttendanceEvents from './attendance/AttendanceEvents'
import AttendancePeople from './attendance/AttendancePeople'
import AttendanceReports from './attendance/AttendanceReports'
import AttendanceSettings from './attendance/AttendanceSettings'

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Attendance" 
        subtitle="Monitor and manage attendance across your organization"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="pa-tabs">
        <TabsList>
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
