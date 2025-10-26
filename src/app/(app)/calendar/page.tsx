'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';

export default function CalendarPage() {
  const calendarId = "kecamatan.gandrungmangu2020@gmail.com";
  const calendarSrc = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=Asia/Jakarta`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendar"
        description={`Displaying events from ${calendarId}`}
      />

      <Card>
        <CardContent className="p-0">
          <iframe
            src={calendarSrc}
            style={{ border: 0 }}
            width="100%"
            height="800"
            frameBorder="0"
            scrolling="no"
          ></iframe>
        </CardContent>
      </Card>
    </div>
  );
}
