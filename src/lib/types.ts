export type SPPDStatus = 'DRAFT' | 'APPROVED' | 'ON-GOING' | 'COMPLETED' | 'CANCELED';

export type Employee = {
  id: string;
  name: string;
  nip: string;
  position: string;
  avatarUrl: string;
};

export type SPPD = {
  id: string;
  activity: string;
  sppdNumber: string;
  srikandiNumber?: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  executors: Employee[];
  status: SPPDStatus;
};
