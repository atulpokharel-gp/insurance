from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class UserInfo(BaseModel):
    id: int
    username: str
    is_admin: bool
    advisor_id: Optional[int] = None

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class WebsiteContentBase(BaseModel):
    page: str
    section: str
    content: Dict[str, Any]

class WebsiteContentCreate(WebsiteContentBase):
    pass

class WebsiteContent(WebsiteContentBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

class AdvisorBase(BaseModel):
    name: str
    location: str
    phone: str
    email: EmailStr
    hours: str
    bio: Optional[str] = None
    image_url: Optional[str] = None

class AdvisorCreate(AdvisorBase):
    pass

class AdvisorUpdate(AdvisorBase):
    is_active: Optional[bool] = None

class Advisor(AdvisorBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ConsultationRequestBase(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    discussion_topic: str
    advisor_id: int

class ConsultationRequestCreate(ConsultationRequestBase):
    pass

class ConsultationRequest(ConsultationRequestBase):
    id: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    advisor: Optional[Advisor] = None

    class Config:
        from_attributes = True

class InsuranceQuoteBase(BaseModel):
    insurance_type: str
    full_name: str
    email: EmailStr
    phone: str
    details: Dict[str, Any]

class InsuranceQuoteCreate(InsuranceQuoteBase):
    pass

class InsuranceQuote(InsuranceQuoteBase):
    id: int
    estimated_premium: Optional[float] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ContactMessageBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

class ContactMessageCreate(ContactMessageBase):
    pass

class ContactMessage(ContactMessageBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TestimonialBase(BaseModel):
    name: str
    rating: int
    comment: str
    location: Optional[str] = None

class TestimonialCreate(TestimonialBase):
    pass

class Testimonial(TestimonialBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class EmailSettingsBase(BaseModel):
    provider: Optional[str] = None
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    use_tls: Optional[bool] = True
    from_name: Optional[str] = None
    from_email: Optional[EmailStr] = None
    forward_to_email: Optional[EmailStr] = None
    is_active: Optional[bool] = True

class EmailSettingsUpdate(EmailSettingsBase):
    smtp_password: Optional[str] = None

class EmailSettingsResponse(EmailSettingsBase):
    id: Optional[int] = None
    has_password: bool = False
    updated_at: Optional[datetime] = None

class ClientProfileBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    advisor_id: Optional[int] = None
    id_expiration_date: Optional[datetime] = None
    id_document_url: Optional[str] = None

class ClientProfileCreate(ClientProfileBase):
    pass

class ClientProfileResponse(ClientProfileBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ClientDocumentResponse(BaseModel):
    id: int
    client_id: int
    advisor_id: int
    filename: str
    original_filename: str
    mime_type: str
    url: str
    created_at: datetime

    class Config:
        from_attributes = True
