import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AppReportsPage() {
  const reports = [
    { name: 'Daily Summary', description: 'Overview of today\'s activities', date: 'Today', type: 'daily' },
    { name: 'Weekly Performance', description: 'Week performance metrics', date: 'This Week', type: 'weekly' },
    { name: 'Monthly Revenue', description: 'Monthly financial summary', date: 'November 2025', type: 'monthly' },
    { name: 'Patient Statistics', description: 'Patient demographics and trends', date: 'Last 30 days', type: 'analytics' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-gray-500">View and download performance reports</p>
        </div>
        <Button variant="outline">
          <Calendar className="w-4 h-4 mr-2" />
          Select Period
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-600 font-medium">Appointments This Week</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">47</p>
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +12% from last week
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Reports Generated</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">12</p>
                <p className="text-sm text-gray-500 mt-1">This month</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-500" />
            Available Reports
          </CardTitle>
          <CardDescription>Generate and download reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    report.type === 'daily' ? 'bg-blue-100' :
                    report.type === 'weekly' ? 'bg-purple-100' :
                    report.type === 'monthly' ? 'bg-green-100' : 'bg-orange-100'
                  }`}>
                    <FileText className={`w-5 h-5 ${
                      report.type === 'daily' ? 'text-blue-600' :
                      report.type === 'weekly' ? 'text-purple-600' :
                      report.type === 'monthly' ? 'text-green-600' : 'text-orange-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">{report.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{report.date}</span>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
