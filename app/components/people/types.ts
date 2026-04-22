export interface PersonDocument {
  id: string;
  title: string;
  status: string;
}

export interface PersonRoomAssignment {
  number: string;
  floor: number;
  building: string;
}

export interface TeamOption {
  teamId: string;
  label: string;
}
