
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/platformAdmin'

export default function AttendanceOverview() {
  return (
    <div className="pa-grid pa-grid-cols-3 pa-gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pa-text-3xl pa-font-bold">--%</div>
          <div className="pa-text-sm pa-text-neutral-500">Overall average</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Missing Reports</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="pa-text-3xl pa-font-bold">--</div>
           <div className="pa-text-sm pa-text-neutral-500">Events with no attendance</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>At Risk Athletes</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="pa-text-3xl pa-font-bold">--</div>
           <div className="pa-text-sm pa-text-neutral-500">Below 70% attendance</div>
        </CardContent>
      </Card>

      <div className="pa-col-span-3">
        <Card>
           <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
           <CardContent>
             <p className="pa-text-neutral-500">No recent activity data available.</p>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
