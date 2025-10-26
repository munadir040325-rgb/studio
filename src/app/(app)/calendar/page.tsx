'use client';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const events = [
    { id: 1, title: 'Rakornas KemenPUPR', date: new Date('2024-09-10T10:00:00'), color: 'bg-primary' },
    { id: 2, title: 'Bimtek Siskeudes', date: new Date('2024-09-15T14:00:00'), color: 'bg-accent' },
    { id: 3, title: 'Meeting Pembahasan DAK', date: new Date('2024-09-20T09:00:00'), color: 'bg-destructive' },
    { id: 4, title: 'Cuti Bersama', date: new Date('2024-09-16T00:00:00'), color: 'bg-yellow-500' },
];

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const isDateMatch = selectedDate ? event.date.toDateString() === selectedDate.toDateString() : true;
      const isSearchMatch = searchTerm ? event.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      return isDateMatch && isSearchMatch;
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [selectedDate, searchTerm]);

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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 md:grow-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Filter by event name..." 
                        className="pl-10 w-full md:w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={'outline'}
                        className={cn(
                            'w-full md:w-[240px] justify-start text-left font-normal',
                            !selectedDate && 'text-muted-foreground'
                        )}
                        >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : <span>Filter by date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        />
                    </PopoverContent>
                </Popover>
                 {selectedDate && (
                    <Button variant="ghost" onClick={() => setSelectedDate(undefined)}>Clear Date</Button>
                )}
            </div>
        </CardHeader>
        <div className="p-6 pt-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredEvents.length > 0 ? (
                    filteredEvents.map(event => (
                        <Card key={event.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">{event.title}</CardTitle>
                                <CardDescription>{format(event.date, 'PPPP p')}</CardDescription>
                            </CardHeader>
                            <div className="flex-grow flex items-end p-6 pt-0">
                               <div className={`w-full h-2 rounded-full ${event.color}`} />
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        <p>No events found for the selected criteria.</p>
                    </div>
                )}
            </div>
        </div>
      </Card>
    </div>
  );
}
