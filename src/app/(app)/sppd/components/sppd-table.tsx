'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Printer, FileCheck2 } from 'lucide-react';
import type { SPPD } from '@/lib/types';
import { format } from 'date-fns';

type SppdTableProps = {
  data: SPPD[];
};

const getStatusBadgeVariant = (status: SPPD['status']) => {
  switch (status) {
    case 'APPROVED':
      return 'default';
    case 'ON-GOING':
      return 'default';
    case 'COMPLETED':
      return 'secondary';
    case 'CANCELED':
      return 'destructive';
    case 'DRAFT':
      return 'outline';
    default:
      return 'default';
  }
};

const getStatusBadgeClass = (status: SPPD['status']) => {
    switch (status) {
        case 'APPROVED':
            return 'bg-blue-500 hover:bg-blue-600 text-white';
        case 'ON-GOING':
            return 'bg-accent hover:bg-green-600 text-accent-foreground';
        case 'DRAFT':
            return 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 border-yellow-500';
        default:
            return '';
    }
}

export function SppdTable({ data }: SppdTableProps) {
  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead>Executors</TableHead>
            <TableHead>Departure</TableHead>
            <TableHead>Return</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sppd) => (
            <TableRow key={sppd.id}>
              <TableCell>
                <div className="font-medium">{sppd.activity}</div>
                <div className="text-sm text-muted-foreground">{sppd.destination}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center -space-x-2">
                  {sppd.executors.map((executor) => (
                    <Avatar key={executor.id} className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={executor.avatarUrl} data-ai-hint="person face" />
                      <AvatarFallback>{executor.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </TableCell>
              <TableCell>{format(sppd.startDate, 'dd MMM yyyy')}</TableCell>
              <TableCell>{format(sppd.endDate, 'dd MMM yyyy')}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(sppd.status)} className={getStatusBadgeClass(sppd.status)}>
                  {sppd.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                     <DropdownMenuItem>
                      <FileCheck2 className="mr-2 h-4 w-4" /> SPJ Report
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Print</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <Printer className="mr-2 h-4 w-4" /> Surat Tugas
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Printer className="mr-2 h-4 w-4" /> TTE Template
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Printer className="mr-2 h-4 w-4" /> SPPD Document
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
