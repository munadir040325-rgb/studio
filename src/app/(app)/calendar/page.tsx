'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar as CalendarComponent,
} from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarIcon, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { useState } from 'react';

const events = [
    { id: 1, title: 'Rakornas KemenPUPR', date: new Date('2024-09-10T10:00:00'), color: 'bg-primary' },
    { id: 2, title: 'Bimtek Siskeudes', date: new Date('2024-09-15T14:00:00'), color: 'bg-accent' },
    { id: 3, title: 'Meeting Pembahasan DAK', date: new Date('2024-09-20T09:00:00'), color: 'bg-destructive' },
    { id: 4, title: 'Cuti Bersama', date: new Date('2024-09-16T00:00:00'), color: 'bg-yellow-500' },
];

type ViewMode = 'monthly' | 'weekly' | 'daily';

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewMode>('monthly');

  const handlePrev = () => {
    if (view === 'monthly') setDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    if (view === 'weekly') setDate(prev => addDays(prev, -7));
    if (view === 'daily') setDate(prev => addDays(prev, -1));
  };
  
  const handleNext = () => {
    if (view === 'monthly') setDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    if (view === 'weekly') setDate(prev => addDays(prev, 7));
    if (view === 'daily') setDate(prev => addDays(prev, 1));
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const day = startOfWeek(date, { weekStartsOn: 1});
    return addDays(day, i);
  });

  const getEventsForDay = (day: Date) => {
    return events.filter(e => e.date.toDateString() === day.toDateString());
  }
  
  const renderWeeklyView = () => (
     <div className="grid grid-cols-7 border-t">
        {weekDays.map(day => (
            <div key={day.toISOString()} className="flex flex-col border-r p-2 h-[40rem] overflow-y-auto">
                <span className="font-semibold text-center sticky top-0 bg-card py-1">{format(day, 'EEE dd')}</span>
                 <div className="mt-2 space-y-2">
                    {getEventsForDay(day).map(event => (
                        <div key={event.id} className={`p-2 rounded-lg text-white ${event.color}`}>
                            <p className="text-xs font-bold">{event.title}</p>
                            <p className="text-xs">{format(event.date, 'p')}</p>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
  );

  const renderDailyView = () => (
    <div className="border-t p-4 h-[40rem] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-card py-2">{format(date, 'EEEE, dd MMMM yyyy')}</h3>
        <div className="space-y-4">
            {getEventsForDay(date).map(event => (
                <div key={event.id} className={`p-4 rounded-lg text-white ${event.color}`}>
                    <p className="font-bold">{event.title}</p>
                    <p>{format(event.date, 'p')}</p>
                </div>
            ))}
            {getEventsForDay(date).length === 0 && (
                <p className="text-muted-foreground">No events for this day.</p>
            )}
        </div>
    </div>
  );


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description="Manage and view your schedule and events."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
             <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">{format(date, view === 'monthly' ? 'MMMM yyyy' : 'dd MMMM yyyy')}</h2>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                </div>
             </div>
             <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'w-[240px] justify-start text-left font-normal',
                            !date && 'text-muted-foreground'
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
                <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
                    <SelectTrigger className="w-full md:w-[120px]">
                        <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                </Select>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === 'monthly' && (
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              month={date}
              onMonthChange={setDate}
              className="p-0"
              components={{
                DayContent: ({ date }) => {
                    const dailyEvents = getEventsForDay(date);
                    return <div className="relative h-full w-full">
                        <span className="absolute top-1 right-1">{date.getDate()}</span>
                        <div className="mt-6 space-y-0.5 p-1 overflow-hidden">
                             {dailyEvents.slice(0, 3).map(event => (
                                <div key={event.id} className={`h-1.5 w-full rounded-full ${event.color}`} title={event.title} />
                            ))}
                            {dailyEvents.length > 3 && (
                                <div className="text-xs text-muted-foreground mt-1">+ {dailyEvents.length - 3} more</div>
                            )}
                        </div>
                    </div>
                }
              }}
              classNames={{
                  months: "w-full",
                  month: "w-full space-y-4",
                  table: "w-full border-collapse",
                  head_row: "flex border-b",
                  head_cell: "w-full text-muted-foreground rounded-md font-normal text-[0.8rem] justify-center",
                  row: "flex w-full mt-2",
                  cell: "h-28 w-full text-center text-sm p-1 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 border",
                  day: "h-full w-full p-0 font-normal aria-selected:opacity-100",
                  day_selected: "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              }}

            />
          )}
          {view === 'weekly' && renderWeeklyView()}
          {view === 'daily' && renderDailyView()}
        </CardContent>
      </Card>
    </div>
  );
}
