"""
Pydantic models for Zero Gate ESO Platform API
Defines request/response models for sponsors, grants, and relationships
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# Enums for validation
class SponsorTier(str, Enum):
    INDIVIDUAL = "Individual"
    CORPORATE = "Corporate"
    FOUNDATION = "Foundation"
    GOVERNMENT = "Government"

class GrantStatus(str, Enum):
    DRAFT = "Draft"
    SUBMITTED = "Submitted"
    UNDER_REVIEW = "Under Review"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    COMPLETED = "Completed"

class MilestoneStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    OVERDUE = "Overdue"

class RelationshipType(str, Enum):
    PROFESSIONAL = "Professional"
    PERSONAL = "Personal"
    BOARD_MEMBER = "Board Member"
    VENDOR = "Vendor"
    PARTNER = "Partner"
    ADVISOR = "Advisor"

class RelationshipStrength(str, Enum):
    WEAK = "Weak"
    MODERATE = "Moderate"
    STRONG = "Strong"

# Base models
class TenantContextModel(BaseModel):
    """Base model that includes tenant context"""
    class Config:
        from_attributes = True

# Sponsor models
class SponsorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    tier: SponsorTier
    organization: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)

class SponsorCreate(SponsorBase):
    pass

class SponsorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    tier: Optional[SponsorTier] = None
    organization: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class SponsorResponse(SponsorBase, TenantContextModel):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

class SponsorMetrics(BaseModel):
    total_sponsors: int
    sponsors_by_tier: Dict[str, int]
    recent_additions: int
    top_organizations: List[Dict[str, Any]]
    engagement_score: float

# Grant models
class GrantBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    currency: str = Field(default="USD", max_length=3)
    status: GrantStatus = Field(default=GrantStatus.DRAFT)
    submission_deadline: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sponsor_id: Optional[str] = None
    requirements: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)

    @validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v <= values['start_date']:
                raise ValueError('End date must be after start date')
        return v

class GrantCreate(GrantBase):
    pass

class GrantUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    status: Optional[GrantStatus] = None
    submission_deadline: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    sponsor_id: Optional[str] = None
    requirements: Optional[str] = None
    tags: Optional[List[str]] = None

class GrantResponse(GrantBase, TenantContextModel):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    sponsor: Optional[SponsorResponse] = None

class GrantMilestoneBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: date
    status: MilestoneStatus = Field(default=MilestoneStatus.PENDING)
    completion_percentage: int = Field(default=0, ge=0, le=100)

class GrantMilestoneCreate(GrantMilestoneBase):
    grant_id: str

class GrantMilestoneUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[MilestoneStatus] = None
    completion_percentage: Optional[int] = Field(None, ge=0, le=100)

class GrantMilestoneResponse(GrantMilestoneBase, TenantContextModel):
    id: str
    grant_id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

class GrantTimeline(BaseModel):
    grant: GrantResponse
    milestones: List[GrantMilestoneResponse]
    timeline_analysis: Dict[str, Any]
    critical_path: List[str]

class GrantMetrics(BaseModel):
    total_grants: int
    grants_by_status: Dict[str, int]
    total_funding: float
    average_grant_size: float
    success_rate: float
    upcoming_deadlines: List[Dict[str, Any]]

# Relationship models
class RelationshipBase(BaseModel):
    source_id: str = Field(..., description="Source entity ID (sponsor/person)")
    target_id: str = Field(..., description="Target entity ID (sponsor/person)")
    relationship_type: RelationshipType
    strength: RelationshipStrength = Field(default=RelationshipStrength.MODERATE)
    description: Optional[str] = None
    established_date: Optional[date] = None
    tags: Optional[List[str]] = Field(default_factory=list)

class RelationshipCreate(RelationshipBase):
    pass

class RelationshipUpdate(BaseModel):
    relationship_type: Optional[RelationshipType] = None
    strength: Optional[RelationshipStrength] = None
    description: Optional[str] = None
    established_date: Optional[date] = None
    tags: Optional[List[str]] = None

class RelationshipResponse(RelationshipBase, TenantContextModel):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    source_entity: Optional[Dict[str, Any]] = None
    target_entity: Optional[Dict[str, Any]] = None

class PathNode(BaseModel):
    entity_id: str
    entity_type: str
    entity_name: str
    relationship_type: Optional[str] = None
    strength: Optional[str] = None

class RelationshipPath(BaseModel):
    source_id: str
    target_id: str
    path_length: int
    nodes: List[PathNode]
    total_strength_score: float
    confidence_score: float

class SevenDegreePathResponse(BaseModel):
    source_entity: Dict[str, Any]
    target_entity: Dict[str, Any]
    paths_found: List[RelationshipPath]
    shortest_path: Optional[RelationshipPath]
    strongest_path: Optional[RelationshipPath]
    analysis: Dict[str, Any]

class RelationshipMetrics(BaseModel):
    total_relationships: int
    relationships_by_type: Dict[str, int]
    relationships_by_strength: Dict[str, int]
    network_density: float
    key_connectors: List[Dict[str, Any]]
    isolated_entities: List[Dict[str, Any]]

# Generic response models
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SuccessResponse(BaseModel):
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Search and filter models
class SponsorFilters(BaseModel):
    tier: Optional[SponsorTier] = None
    organization: Optional[str] = None
    tags: Optional[List[str]] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

class GrantFilters(BaseModel):
    status: Optional[GrantStatus] = None
    sponsor_id: Optional[str] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    deadline_after: Optional[date] = None
    deadline_before: Optional[date] = None
    tags: Optional[List[str]] = None

class RelationshipFilters(BaseModel):
    relationship_type: Optional[RelationshipType] = None
    strength: Optional[RelationshipStrength] = None
    source_id: Optional[str] = None
    target_id: Optional[str] = None
    established_after: Optional[date] = None
    established_before: Optional[date] = None