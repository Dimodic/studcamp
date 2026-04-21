export type UserRole = "participant" | "teacher" | "organizer";
export type VisibilityMode = "name_only" | "name_plus_fields";
export type EventAttendance = "confirmed" | "pending" | "not_checked";
export type EventStatus = "upcoming" | "in_progress" | "completed" | "changed" | "cancelled";
export type ProjectSelectionPhase = "countdown" | "open" | "closed" | "results";
export type StoryType = "info" | "urgent" | "navigation" | "project";
export type UpdateType = "change" | "info" | "urgent";
export type DocumentStatus = "done" | "in_progress" | "blocked" | "not_started";
export type MaterialType = "presentation" | "recording" | "guide" | "checklist" | "org_doc";
export type ResourceCategory = "study" | "projects" | "logistics" | "housing" | "forms" | "media";
export type ResourceKind = "doc" | "sheet" | "form" | "folder" | "calendar" | "gallery" | "map" | "repo" | "guide";

export interface Camp {
  id: string;
  name: string;
  shortDesc?: string | null;
  city: string;
  university: string;
  dates: {
    start: string;
    end: string;
  };
  status: string;
}

export interface Person {
  id: string;
  name: string;
  role: UserRole;
  university?: string | null;
  city?: string | null;
  telegram?: string | null;
  photo?: string | null;
  visibility: VisibilityMode;
}

export interface CurrentUser extends Person {
  email?: string | null;
  notificationsOn: boolean;
  capabilities: CapabilitySet;
}

export interface CapabilitySet {
  canManageAll: boolean;
  canCreateEvents: boolean;
  canEditAllEvents: boolean;
  canEditOwnEvents: boolean;
  canManageUsers: boolean;
  canManageStories: boolean;
  canManageUpdates: boolean;
  canManageProjects: boolean;
  canManageMaterials: boolean;
  canManageResources: boolean;
  canManageCampus: boolean;
  canManageDocuments: boolean;
  canManageRooms: boolean;
  canAssignTeachers: boolean;
}

export interface Event {
  id: string;
  date: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  place: string;
  building: string;
  address: string;
  status: EventStatus;
  description?: string | null;
  materials?: string[] | null;
  attendance?: EventAttendance | null;
  day: number;
  teacherIds: string[];
}

export interface Project {
  id: string;
  title: string;
  shortDescription: string;
  direction: string;
  minTeam: number;
  maxTeam: number;
}

export interface StorySlide {
  image: string;
  text: string;
  caption?: string | null;
}

export interface Story {
  id: string;
  title: string;
  type: StoryType;
  image: string;
  read: boolean;
  slides: StorySlide[];
}

export interface OrgUpdate {
  id: string;
  text: string;
  time: string;
  isNew: boolean;
  type: UpdateType;
  isRead: boolean;
}

export interface DocItem {
  id: string;
  title: string;
  description: string;
  status: DocumentStatus;
  deadline?: string | null;
  critical: boolean;
  fallback?: string | null;
}

export interface CampusCategory {
  id: string;
  icon: string;
  title: string;
  items: {
    title: string;
    detail: string;
  }[];
}

export interface RoomInfo {
  number: string;
  floor: number;
  building: string;
  neighbors: string[];
  keyInfo: string;
  rules: string[];
}

export interface AdminUser extends Person {
  email?: string | null;
  notificationsOn: boolean;
  isActive: boolean;
  showInPeople: boolean;
}

export interface AdminDocument extends DocItem {
  userId: string;
}

export interface AdminRoomAssignment extends RoomInfo {
  userId: string;
}

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  day?: number | null;
  eventId?: string | null;
  topic?: string | null;
  fileSize?: string | null;
  isNew: boolean;
  url: string;
}

export interface Resource {
  id: string;
  title: string;
  category: ResourceCategory;
  kind: ResourceKind;
  description?: string | null;
  url: string;
  day?: number | null;
  eventId?: string | null;
  isNew: boolean;
}

export interface BootstrapPayload {
  camp: Camp;
  currentUser: CurrentUser;
  events: Event[];
  people: Person[];
  projects: Project[];
  projectSelectionPhase: ProjectSelectionPhase;
  projectPriorities: string[];
  stories: Story[];
  orgUpdates: OrgUpdate[];
  documents: DocItem[];
  campusCategories: CampusCategory[];
  room?: RoomInfo | null;
  materials: Material[];
  resources: Resource[];
  adminUsers: AdminUser[];
  adminDocuments: AdminDocument[];
  adminRoomAssignments: AdminRoomAssignment[];
  ui: {
    currentDay: number;
    totalDays: number;
  };
  lastSyncedAt: string;
}

export type AdminResourcePath =
  | "stories"
  | "org-updates"
  | "events"
  | "users"
  | "projects"
  | "materials"
  | "resources"
  | "campus-categories"
  | "room-assignments"
  | "documents";

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: CurrentUser;
}

