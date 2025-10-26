'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Hourglass, CheckCircle, Plane, Briefcase } from 'lucide-react';
import { sppds } from '@/lib/data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';


const statusConfig = {
  DRAFT: { icon: Hourglass, color: 'bg-yellow-500' },
  APPROVED: { icon: CheckCircle, color: 'bg-blue-500' },
  'ON-GOING': { icon: Plane, color: 'bg-green-500' },
  COMPLETED: { icon: Briefcase, color: 'bg-gray-500' },
  CANCELED: { icon: FileText, color: 'bg-red-500' },
};

const chartConfig = {
  total: {
    label: 'Total SPPD',
  },
};

export default function DashboardPage() {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    setChartData([
      { month: 'Jan', total: Math.floor(Math.random() * 20) + 5 },
      { month: 'Feb', total: Math.floor(Math.random() * 20) + 5 },
      { month: 'Mar', total: Math.floor(Math.random() * 20) + 5 },
      { month: 'Apr', total: Math.floor(Math.random() * 20) + 5 },
      { month: 'May', total: Math.floor(Math.random() * 20) + 5 },
      { month: 'Jun', total: Math.floor(Math.random() * 20) + 5 },
    ]);
  }, []);

  const recentSppds = sppds.slice(0, 5);

  return (
    <div className="flex flex-col gap-6 w-full">
       <PageHeader
        title="Dashboard"
        description="Ringkasan dan statistik terbaru dari aktivitas SPPD."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SPPD</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">125</div>
            <p className="text-xs text-muted-foreground">+5 from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">82</div>
            <p className="text-xs text-muted-foreground">Ready for travel</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Going</CardTitle>
            <Plane className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Currently travelling</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending SPJ</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">Awaiting report</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>SPPD Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                 <ChartTooltip
                  cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activities</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sppd">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSppds.map((sppd) => (
                <div key={sppd.id} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {sppd.executors[0].position.includes('Kepala') ? <Briefcase className="h-5 w-5" /> : <Plane className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium truncate">{sppd.activity}</p>
                    <p className="text-sm text-muted-foreground">{sppd.destination}</p>
                  </div>
                  <Badge variant={sppd.status === 'COMPLETED' ? 'secondary' : 'default'}
                    className={`text-xs ${
                      sppd.status === 'APPROVED' ? 'bg-primary' :
                      sppd.status === 'ON-GOING' ? 'bg-accent text-accent-foreground' :
                      sppd.status === 'DRAFT' ? 'bg-yellow-400 text-yellow-900' :
                      sppd.status === 'CANCELED' ? 'bg-red-500 text-white' : ''
                    }`}
                  >{sppd.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
