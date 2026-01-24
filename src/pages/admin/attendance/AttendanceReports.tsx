
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../../components/platformAdmin'

export default function AttendanceReports() {
  return (
    <div className="pa-grid pa-grid-cols-2 pa-gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Organization Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="pa-mb-4 pa-text-sm pa-text-neutral-500">
            Generate a full breakdown of attendance by team and season.
          </p>
          <Button variant="blue">Download CSV</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Missing Attendance Report</CardTitle>
        </CardHeader>
        <CardContent>
           <p className="pa-mb-4 pa-text-sm pa-text-neutral-500">
             List of all events where attendance has not been submitted.
           </p>
           <Button variant="blue">Download CSV</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>At-Risk Players</CardTitle>
        </CardHeader>
        <CardContent>
           <p className="pa-mb-4 pa-text-sm pa-text-neutral-500">
             List of players with attendance below the "Watch" threshold.
           </p>
           <Button variant="blue">Download PDF</Button>
        </CardContent>
      </Card>
    </div>
  )
}
