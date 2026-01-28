
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/platformAdmin'

export default function AttendanceOverview() {
  return (
    <div className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-3 pa-gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Attendance Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pa-text-2xl sm:pa-text-3xl pa-font-bold">--%</div>
          <div className="pa-text-sm pa-text-neutral-500">Overall average</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Missing Reports</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="pa-text-2xl sm:pa-text-3xl pa-font-bold">--</div>
           <div className="pa-text-sm pa-text-neutral-500">Events with no attendance</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">At Risk Athletes</CardTitle>
        </CardHeader>
        <CardContent>
           <div className="pa-text-2xl sm:pa-text-3xl pa-font-bold">--</div>
           <div className="pa-text-sm pa-text-neutral-500">Below 70% attendance</div>
        </CardContent>
      </Card>

      <div className="pa-col-span-1 sm:pa-col-span-2 lg:pa-col-span-3">
        <Card>
           <CardHeader><CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle></CardHeader>
           <CardContent>
             <p className="pa-text-neutral-500">No recent activity data available.</p>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}
