from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime
import enum

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdvisorAccount(Base):
    __tablename__ = "advisor_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    advisor_id = Column(Integer, ForeignKey("advisors.id"), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    advisor = relationship("Advisor")

class WebsiteContent(Base):
    __tablename__ = "website_content"
    
    id = Column(Integer, primary_key=True, index=True)
    page = Column(String, index=True)
    section = Column(String, index=True)
    content = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Advisor(Base):
    __tablename__ = "advisors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    location = Column(String)
    phone = Column(String)
    email = Column(String)
    hours = Column(String)
    bio = Column(Text)
    image_url = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConsultationRequest(Base):
    __tablename__ = "consultation_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String)
    phone = Column(String)
    discussion_topic = Column(String)
    advisor_id = Column(Integer, ForeignKey("advisors.id"))
    preferred_date = Column(DateTime)
    preferred_time = Column(String)
    status = Column(String, default="pending")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime)
    
    advisor = relationship("Advisor")

class InsuranceQuote(Base):
    __tablename__ = "insurance_quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    insurance_type = Column(String)
    full_name = Column(String)
    email = Column(String)
    phone = Column(String)
    reason = Column(Text)  # New field for quote reason
    details = Column(JSON)
    estimated_premium = Column(Float)
    status = Column(String, default="pending")
    priority = Column(String, default="medium")
    assigned_to = Column(String)  # Advisor assigned to handle quote
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ContactMessage(Base):
    __tablename__ = "contact_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    phone = Column(String)
    subject = Column(String)
    message = Column(Text)
    status = Column(String, default="unread")
    priority = Column(String, default="medium")
    assigned_to = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Testimonial(Base):
    __tablename__ = "testimonials"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    rating = Column(Integer)
    comment = Column(Text)
    location = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TimeSlot(Base):
    __tablename__ = "time_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    advisor_id = Column(Integer, ForeignKey("advisors.id"))
    date = Column(DateTime)
    time = Column(String)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    advisor = relationship("Advisor")

class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    phone = Column(String)
    email = Column(String)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    subject = Column(String)
    body = Column(Text)
    template_type = Column(String)  # quote, consultation, contact, etc.
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmailLog(Base):
    __tablename__ = "email_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    recipient = Column(String)
    subject = Column(String)
    body = Column(Text)
    template_used = Column(String)
    status = Column(String, default="sent")
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class QuoteReason(Base):
    __tablename__ = "quote_reasons"
    
    id = Column(Integer, primary_key=True, index=True)
    reason = Column(String, unique=True)
    description = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True)
    receive_quotes = Column(Boolean, default=True)
    receive_consultations = Column(Boolean, default=True)
    receive_contacts = Column(Boolean, default=True)
    forward_email = Column(String, default="atulpokharel10@gmail.com")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class EmailSettings(Base):
    __tablename__ = "email_settings"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, default="custom")
    smtp_server = Column(String)
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String)
    smtp_password_encrypted = Column(Text)
    use_tls = Column(Boolean, default=True)
    from_name = Column(String, default="Gautam Insurance Agency")
    from_email = Column(String)
    forward_to_email = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_username = Column(String)
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(Integer)
    details = Column(JSON)
    ip_address = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id = Column(Integer, primary_key=True, index=True)
    advisor_id = Column(Integer, ForeignKey("advisors.id"))
    full_name = Column(String)
    email = Column(String)
    phone = Column(String)
    notes = Column(Text)
    id_expiration_date = Column(DateTime)
    id_document_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    advisor = relationship("Advisor")


class ClientDocument(Base):
    __tablename__ = "client_documents"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("client_profiles.id"))
    advisor_id = Column(Integer, ForeignKey("advisors.id"))
    filename = Column(String)
    original_filename = Column(String)
    mime_type = Column(String)
    url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("ClientProfile")
    advisor = relationship("Advisor")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    token_hash = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
