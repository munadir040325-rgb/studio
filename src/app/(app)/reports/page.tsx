'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

export default function ReportsPage() {
  const [executionDate, setExecutionDate] = useState<DateRange | undefined>();
  const [spjDate, setSpjDate] = useState<DateRange | undefined>();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="SPPD Recap Reports"
        description="Download SPPD data in various formats based on selected criteria."
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtering Options</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label>Execution Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'justify-start text-left font-normal',
                    !executionDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {executionDate?.from ? (
                    executionDate.to ? (
                      <>
                        {format(executionDate.from, 'LLL dd, y')} -{' '}
                        {format(executionDate.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(executionDate.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={executionDate}
                  onSelect={setExecutionDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label>SPJ Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'justify-start text-left font-normal',
                    !spjDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {spjDate?.from ? (
                    spjDate.to ? (
                      <>
                        {format(spjDate.from, 'LLL dd, y')} -{' '}
                        {format(spjDate.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(spjDate.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={spjDate}
                  onSelect={setSpjDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="executor-name">Executor Name</Label>
            <Input id="executor-name" placeholder="Enter employee name" />
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
             <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <FileDown className="mr-2 h-4 w-4" />
                Download Excel
            </Button>
            <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
