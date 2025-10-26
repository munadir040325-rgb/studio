import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Link, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const isSheetsConnected = true;
  const isCalendarConnected = false;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage application settings and integrations."
      />
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>
            Connect your Google account to sync data with Sheets and Calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-start gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-700"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                  <path d="M10 3v18" />
                  <path d="M16 3v18" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Google Sheets</h3>
                <p className="text-sm text-muted-foreground">
                  Import and export SPPD data seamlessly.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSheetsConnected ? (
                <>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                  <Button variant="outline">Disconnect</Button>
                </>
              ) : (
                <>
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not Connected
                  </Badge>
                  <Button>
                    <Link className="mr-1 h-4 w-4" />
                    Connect
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-start gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-700"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Google Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Sync SPPD schedules to your calendar automatically.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCalendarConnected ? (
                <>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                  <Button variant="outline">Disconnect</Button>
                </>
              ) : (
                <>
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Not Connected
                  </Badge>
                  <Button>
                    <Link className="mr-1 h-4 w-4" />
                    Connect
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
