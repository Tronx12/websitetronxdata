export interface UserRef {
  _id: string;
  name: string;
  email: string;
  role?: string;
  phoneNumber?: string;
  workingShift?: "day" | "night";
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  teamLead: UserRef;
  members: UserRef[];
  createdBy: UserRef;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}