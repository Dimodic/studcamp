from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CampDatesSchema(BaseSchema):
    start: date
    end: date


class CampSchema(BaseSchema):
    id: str
    name: str
    shortDesc: str | None = None
    city: str
    university: str
    dates: CampDatesSchema
    status: str


class PersonSchema(BaseSchema):
    id: str
    name: str
    role: str
    university: str | None = None
    city: str | None = None
    telegram: str | None = None
    photo: str | None = None
    visibility: str


class CapabilitySchema(BaseSchema):
    canManageAll: bool = False
    canCreateEvents: bool = False
    canEditAllEvents: bool = False
    canEditOwnEvents: bool = False
    canManageUsers: bool = False
    canManageStories: bool = False
    canManageUpdates: bool = False
    canManageProjects: bool = False
    canManageMaterials: bool = False
    canManageResources: bool = False
    canManageCampus: bool = False
    canManageDocuments: bool = False
    canManageRooms: bool = False
    canAssignTeachers: bool = False


class CurrentUserSchema(PersonSchema):
    email: str | None = None
    notificationsOn: bool
    capabilities: CapabilitySchema


class EventSchema(BaseSchema):
    id: str
    date: date
    title: str
    type: str
    startAt: str
    endAt: str
    place: str
    building: str
    address: str
    status: str
    description: str | None = None
    materials: list[str] | None = None
    attendance: str | None = None
    day: int
    teacherIds: list[str] = Field(default_factory=list)


class ProjectSchema(BaseSchema):
    id: str
    title: str
    shortDescription: str
    description: str | None = None
    direction: str
    minTeam: int
    maxTeam: int
    mentorName: str | None = None
    mentorPosition: str | None = None
    mentorCity: str | None = None
    mentorTelegram: str | None = None
    mentorPhoto: str | None = None
    mentorWorkFormat: str | None = None


class StorySlideSchema(BaseSchema):
    image: str
    text: str
    caption: str | None = None


class StorySlideInputSchema(BaseModel):
    image: str
    text: str
    caption: str | None = None


class StorySchema(BaseSchema):
    id: str
    title: str
    type: str
    image: str
    read: bool
    slides: list[StorySlideSchema]


class OrgUpdateSchema(BaseSchema):
    id: str
    text: str
    time: str
    isNew: bool
    type: str
    isRead: bool


class DocumentSchema(BaseSchema):
    id: str
    title: str
    description: str
    status: str
    deadline: str | None = None
    critical: bool
    fallback: str | None = None


class CampusItemSchema(BaseSchema):
    title: str
    detail: str


class CampusCategorySchema(BaseSchema):
    id: str
    icon: str
    title: str
    items: list[CampusItemSchema]


class RoomInfoSchema(BaseSchema):
    number: str
    floor: int
    building: str
    neighbors: list[str]
    keyInfo: str
    rules: list[str]


class AdminUserSchema(PersonSchema):
    email: str | None = None
    notificationsOn: bool
    isActive: bool
    showInPeople: bool


class AdminDocumentSchema(BaseSchema):
    id: str
    userId: str
    title: str
    description: str
    status: str
    deadline: str | None = None
    critical: bool
    fallback: str | None = None


class AdminRoomAssignmentSchema(RoomInfoSchema):
    userId: str


class MaterialSchema(BaseSchema):
    id: str
    title: str
    type: str
    day: int | None = None
    eventId: str | None = None
    topic: str | None = None
    fileSize: str | None = None
    isNew: bool
    url: str


class ResourceSchema(BaseSchema):
    id: str
    title: str
    category: str
    kind: str
    description: str | None = None
    url: str
    day: int | None = None
    eventId: str | None = None
    isNew: bool


class UiStateSchema(BaseSchema):
    currentDay: int
    totalDays: int


class BootstrapSchema(BaseSchema):
    camp: CampSchema
    currentUser: CurrentUserSchema
    events: list[EventSchema]
    people: list[PersonSchema]
    projects: list[ProjectSchema]
    projectSelectionPhase: str
    projectPriorities: list[str]
    stories: list[StorySchema]
    orgUpdates: list[OrgUpdateSchema]
    documents: list[DocumentSchema]
    campusCategories: list[CampusCategorySchema]
    room: RoomInfoSchema | None = None
    materials: list[MaterialSchema]
    resources: list[ResourceSchema]
    adminUsers: list[AdminUserSchema] = Field(default_factory=list)
    adminDocuments: list[AdminDocumentSchema] = Field(default_factory=list)
    adminRoomAssignments: list[AdminRoomAssignmentSchema] = Field(default_factory=list)
    ui: UiStateSchema
    lastSyncedAt: datetime


class LoginRequestSchema(BaseModel):
    email: str
    password: str


class LoginResponseSchema(BaseSchema):
    token: str
    expiresAt: datetime
    user: CurrentUserSchema


class ProjectPreferencesSchema(BaseModel):
    projectIds: list[str]


class ProfilePreferencesSchema(BaseModel):
    visibilityMode: str | None = None
    notificationsOn: bool | None = None


class MarkUpdatesReadSchema(BaseModel):
    updateIds: list[str] | None = None
    markAll: bool = False


class EventCheckInSchema(BaseModel):
    attendance: str = "confirmed"


class StoryUpsertSchema(BaseModel):
    title: str
    type: str
    image: str
    slides: list[StorySlideInputSchema]


class OrgUpdateUpsertSchema(BaseModel):
    text: str
    time: str
    isNew: bool = True
    type: str


class EventUpsertSchema(BaseModel):
    date: date
    title: str
    type: str
    startAt: str
    endAt: str
    place: str
    building: str
    address: str
    status: str
    description: str | None = None
    materials: list[str] | None = None
    day: int | None = None
    teacherIds: list[str] = Field(default_factory=list)


class UserUpsertSchema(BaseModel):
    name: str
    role: str
    university: str | None = None
    city: str | None = None
    telegram: str | None = None
    photo: str | None = None
    visibility: str
    notificationsOn: bool = True
    isActive: bool = True
    showInPeople: bool = True
    email: str | None = None
    password: str | None = None


class ProjectUpsertSchema(BaseModel):
    title: str
    shortDescription: str
    description: str | None = None
    direction: str
    minTeam: int
    maxTeam: int
    mentorName: str | None = None
    mentorPosition: str | None = None
    mentorCity: str | None = None
    mentorTelegram: str | None = None
    mentorPhoto: str | None = None
    mentorWorkFormat: str | None = None


class MaterialUpsertSchema(BaseModel):
    title: str
    type: str
    day: int | None = None
    eventId: str | None = None
    topic: str | None = None
    fileSize: str | None = None
    isNew: bool = False
    url: str


class ResourceUpsertSchema(BaseModel):
    title: str
    category: str
    kind: str
    description: str | None = None
    url: str
    day: int | None = None
    eventId: str | None = None
    isNew: bool = False


class CampusItemInputSchema(BaseModel):
    title: str
    detail: str


class CampusCategoryUpsertSchema(BaseModel):
    icon: str
    title: str
    items: list[CampusItemInputSchema]


class RoomAssignmentUpsertSchema(BaseModel):
    userId: str
    number: str
    floor: int
    building: str
    neighbors: list[str]
    keyInfo: str
    rules: list[str]


class DocumentUpsertSchema(BaseModel):
    userId: str
    title: str
    description: str
    status: str
    deadline: str | None = None
    critical: bool = False
    fallback: str | None = None


class CampUpsertSchema(BaseModel):
    name: str
    shortDesc: str | None = None
    city: str
    university: str
    startDate: date
    endDate: date
    status: str


class SimpleStatusSchema(BaseModel):
    ok: bool = True


class CreatedEntitySchema(SimpleStatusSchema):
    id: str
