from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from backend.database import (
    SessionLocal,
    engine,
    backup_engine,
    Base,
    get_db,
    sync_backup_database,
    ensure_client_profile_columns,
)
from backend.models_enhanced import (
    User, Advisor, ConsultationRequest, InsuranceQuote, ContactMessage, 
    Testimonial, WebsiteContent, TimeSlot, EmergencyContact, EmailTemplate,
    EmailLog, QuoteReason, NotificationPreference, EmailSettings, AuditLog,
    AdvisorAccount, ClientProfile, ClientDocument, PasswordResetToken
)
from backend.schemas import (
    User as UserSchema, UserCreate, Token, UserInfo,
    Advisor as AdvisorSchema, AdvisorCreate, AdvisorUpdate,
    ConsultationRequest as ConsultationRequestSchema, ConsultationRequestCreate,
    InsuranceQuote as InsuranceQuoteSchema, InsuranceQuoteCreate,
    ContactMessage as ContactMessageSchema, ContactMessageCreate,
    Testimonial as TestimonialSchema, TestimonialCreate,
    WebsiteContent as WebsiteContentSchema, WebsiteContentCreate,
    EmailSettingsUpdate, EmailSettingsResponse,
    ClientProfileCreate, ClientProfileResponse, ClientDocumentResponse
)
from backend.auth import (
    authenticate_user, create_access_token, get_current_active_user, 
    get_admin_user, get_password_hash, verify_password
)
from backend.config import get_settings
from backend.email_service import email_service
from backend.security import encrypt_value
from datetime import timedelta, datetime
import secrets
import hashlib
from typing import List, Optional
import json
import os
import shutil
from uuid import uuid4
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Create tables
Base.metadata.create_all(bind=engine)
Base.metadata.create_all(bind=backup_engine)
ensure_client_profile_columns()

app = FastAPI(title="Gautam Insurance API", version="2.0.0")
settings = get_settings()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="../static"), name="static")
app.mount("/uploads", StaticFiles(directory="../uploads"), name="uploads")

# Scheduler for automated tasks
scheduler = AsyncIOScheduler()


def record_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    actor: Optional[User] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None
):
    try:
        audit = AuditLog(
            actor_username=actor.username if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            ip_address=request.client.host if request and request.client else None
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()


def get_advisor_id_for_user(db: Session, user: User) -> Optional[int]:
    if user.is_admin:
        return None
    account = db.query(AdvisorAccount).filter(AdvisorAccount.user_id == user.id).first()
    return account.advisor_id if account else None


def create_password_reset_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=2)
    reset = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at
    )
    db.add(reset)
    db.commit()
    return token

# Initialize admin user and default data
@app.on_event("startup")
async def startup_event():
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_username = settings.admin_username or "admin"
        admin_password = settings.admin_password or "admin123"
        admin = db.query(User).filter(User.username == admin_username).first()
        if not admin:
            hashed_password = admin_password
            if not hashed_password.startswith("$2"):
                hashed_password = get_password_hash(admin_password)

            admin_user = User(
                username=admin_username,
                hashed_password=hashed_password,
                is_admin=True,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            
            # Initialize default website content
            default_content = [
                {
                    "page": "home",
                    "section": "hero",
                    "content": {
                        "title": "Insurance Solutions Tailored for You",
                        "subtitle": "Protect what matters most with comprehensive coverage designed for your unique needs. For over 25 years, we've been simplifying insurance with experienced advisors and cutting-edge technology.",
                        "cta_text": "Get a Quote",
                        "background_image": "/static/images/hero-bg.jpg"
                    }
                },
                {
                    "page": "global",
                    "section": "brand",
                    "content": {
                        "company_name": "Gautam Insurance",
                        "logo_url": ""
                    }
                },
                {
                    "page": "home",
                    "section": "partners",
                    "content": {
                        "title": "We support the following company",
                        "subtitle": "We work with trusted partners to provide more coverage choices for you.",
                        "partners": [
                            {"name": "Progressive", "logo_url": "", "website": ""},
                            {"name": "GEICO", "logo_url": "", "website": ""},
                            {"name": "Foremost", "logo_url": "", "website": ""},
                            {"name": "Guard", "logo_url": "", "website": ""},
                            {"name": "Openly", "logo_url": "", "website": ""},
                            {"name": "Hippo", "logo_url": "", "website": ""},
                            {"name": "National General Insurance", "logo_url": "", "website": ""},
                            {"name": "Branch", "logo_url": "", "website": ""},
                            {"name": "Berkshire Hathaway Homestate Company", "logo_url": "", "website": ""},
                            {"name": "Root", "logo_url": "", "website": ""},
                            {"name": "NEXT", "logo_url": "", "website": ""}
                        ]
                    }
                },
                {
                    "page": "home",
                    "section": "services",
                    "content": {
                        "title": "Our Insurance Solutions",
                        "services": [
                            {
                                "name": "Home Insurance",
                                "description": "Protect your property with coverage built for homeowners and renters alike.",
                                "icon": "home",
                                "slug": "home-insurance"
                            },
                            {
                                "name": "Auto Insurance",
                                "description": "Drive confidently with flexible plans for individuals, families, and fleets.",
                                "icon": "car",
                                "slug": "auto-insurance"
                            },
                            {
                                "name": "Life Insurance",
                                "description": "Secure your loved ones' future with customizable term and whole life policies.",
                                "icon": "heart",
                                "slug": "life-insurance"
                            }
                        ]
                    }
                },
                {
                    "page": "services",
                    "section": "pages",
                    "content": {
                        "title": "Our Insurance Services",
                        "subtitle": "Comprehensive coverage solutions tailored to protect what matters most to you.",
                        "pages": [
                            {
                                "title": "Home Insurance",
                                "slug": "home-insurance",
                                "summary": "Protect your most valuable asset with flexible coverage for homeowners and renters.",
                                "description": "Protect your most valuable asset with comprehensive home insurance coverage. Whether you're a homeowner or renter, we offer policies that safeguard your property, belongings, and liability.",
                                "image_url": "",
                                "highlights": [
                                    "Dwelling protection",
                                    "Personal property coverage",
                                    "Liability protection",
                                    "Additional living expenses",
                                    "Medical payments to others"
                                ],
                                "cta_text": "Get Home Insurance Quote",
                                "cta_link": "index.html#quote"
                            },
                            {
                                "title": "Auto Insurance",
                                "slug": "auto-insurance",
                                "summary": "Drive confidently with coverage options for individuals, families, and fleets.",
                                "description": "Drive with confidence knowing you're protected on the road. Our auto insurance policies offer flexible coverage options for individuals, families, and fleets with competitive rates.",
                                "image_url": "",
                                "highlights": [
                                    "Liability coverage",
                                    "Collision coverage",
                                    "Comprehensive coverage",
                                    "Uninsured motorist protection",
                                    "Personal injury protection"
                                ],
                                "cta_text": "Get Auto Insurance Quote",
                                "cta_link": "index.html#quote"
                            },
                            {
                                "title": "Life Insurance",
                                "slug": "life-insurance",
                                "summary": "Secure your family's future with term and whole life options.",
                                "description": "Secure your family's financial future with life insurance policies designed to provide peace of mind. Choose from term life, whole life, and universal life options.",
                                "image_url": "",
                                "highlights": [
                                    "Term life insurance",
                                    "Whole life insurance",
                                    "Universal life insurance",
                                    "Final expense insurance",
                                    "Group life insurance"
                                ],
                                "cta_text": "Get Life Insurance Quote",
                                "cta_link": "index.html#quote"
                            },
                            {
                                "title": "Commercial Insurance",
                                "slug": "commercial-insurance",
                                "summary": "Protect your business with comprehensive commercial insurance solutions.",
                                "description": "Protect your business with comprehensive commercial insurance solutions. From small businesses to large enterprises, we have the coverage you need.",
                                "image_url": "",
                                "highlights": [
                                    "General liability",
                                    "Property insurance",
                                    "Workers' compensation",
                                    "Professional liability",
                                    "Cyber liability"
                                ],
                                "cta_text": "Schedule Consultation",
                                "cta_link": "index.html#contact"
                            }
                        ]
                    }
                },
                {
                    "page": "home",
                    "section": "why_choose_us",
                    "content": {
                        "title": "Why Choose Gautam Insurance",
                        "description": "For more than 25 years, our mission has been to simplify insurance. We pair experienced advisors with cutting-edge technology to provide clear, actionable guidance and dependable support when you need it most.",
                        "features": [
                            "Licensed agents in Ohio states",
                            "Rated A+ for financial strength",
                            "24/7 claims concierge team"
                        ]
                    }
                }
            ]
            
            for content in default_content:
                db_content = WebsiteContent(**content)
                db.add(db_content)
            
            # Add default advisors
            advisors = [
                {
                    "name": "Puran Gautam",
                    "location": "COLUMBUS LOCATION",
                    "phone": "614-804-0209",
                    "email": "puran.gautam@gautaminsurance.com",
                    "hours": "Weekdays 9:30am-5:30pm",
                    "bio": "Licensed insurance advisor with over 15 years of experience helping clients find the perfect coverage.",
                    "is_active": True
                },
                {
                    "name": "KUMAR MONGER",
                    "location": "AKRON LOCATION",
                    "phone": "330-237-7980",
                    "email": "kumar.monger@gautaminsurance.com",
                    "hours": "Weekdays 9:30am-5:30pm",
                    "bio": "Dedicated insurance professional specializing in commercial and personal insurance solutions.",
                    "is_active": True
                }
            ]
            
            for advisor in advisors:
                db_advisor = Advisor(**advisor)
                db.add(db_advisor)
            db.commit()

            # Add default testimonials
            testimonials = [
                {
                    "name": "Taylor Morgan",
                    "rating": 5,
                    "comment": "When a major storm damaged our home, Gautam Insurance guided us through every step. Their claims team was responsive and fair, and we were back on our feet quickly.",
                    "location": "Columbus, OH",
                    "is_active": True
                },
                {
                    "name": "Samantha Lee",
                    "rating": 5,
                    "comment": "We needed a commercial policy that could grow with us. The advisors at Gautam Insurance built a flexible plan that protects our people, property, and reputation.",
                    "location": "Akron, OH",
                    "is_active": True
                }
            ]
            
            for testimonial in testimonials:
                db_testimonial = Testimonial(**testimonial)
                db.add(db_testimonial)
            
            # Add default quote reasons
            quote_reasons = [
                {"reason": "New Purchase", "description": "Buying a new home, car, or need life insurance"},
                {"reason": "Renewal", "description": "Existing policy renewal"},
                {"reason": "Better Rates", "description": "Looking for better insurance rates"},
                {"reason": "Coverage Review", "description": "Want to review current coverage"},
                {"reason": "Life Changes", "description": "Major life changes (marriage, new baby, etc.)"},
                {"reason": "Business Needs", "description": "Commercial or business insurance needs"},
                {"reason": "Other", "description": "Other reasons"}
            ]
            
            for reason in quote_reasons:
                db_reason = QuoteReason(**reason)
                db.add(db_reason)
            
            # Add default emergency contact
            emergency_contact = EmergencyContact(
                name="24/7 Claims Hotline",
                phone="+1 (800) 555-CLAIM",
                email="claims@gautaminsurance.com",
                description="Emergency claims support available 24/7",
                is_active=True
            )
            db.add(emergency_contact)
            
            # Add default email template
            email_template = EmailTemplate(
                name="quote_notification",
                subject="New Insurance Quote Request",
                body="New quote request received",
                template_type="quote",
                is_active=True
            )
            db.add(email_template)
            
            # Add notification preference
            notification_pref = NotificationPreference(
                email="atulpokharel10@gmail.com",
                forward_email="atulpokharel10@gmail.com",
                receive_quotes=True,
                receive_consultations=True,
                receive_contacts=True
            )
            db.add(notification_pref)
            
            db.commit()

        # Ensure at least 50 testimonials exist
        existing_testimonials = db.query(Testimonial).count()
        target_testimonials = 50
        if existing_testimonials < target_testimonials:
            first_names = [
                "Alex", "Jordan", "Taylor", "Morgan", "Riley",
                "Casey", "Avery", "Jamie", "Cameron", "Drew"
            ]
            last_names = [
                "Smith", "Johnson", "Lee", "Brown", "Davis",
                "Wilson", "Clark", "Lopez", "Nguyen", "Patel"
            ]
            locations = [
                "Columbus, OH", "Akron, OH", "Cleveland, OH",
                "Dayton, OH", "Cincinnati, OH"
            ]
            comments = [
                "Quick response time and clear guidance through the entire process.",
                "Saved us money while improving our coverage options.",
                "Friendly advisors who explained everything in plain language.",
                "The claims team was proactive and kept us informed.",
                "Great experience with tailored recommendations."
            ]

            missing = target_testimonials - existing_testimonials
            for i in range(missing):
                first = first_names[i % len(first_names)]
                last = last_names[(i // len(first_names)) % len(last_names)]
                testimonial = Testimonial(
                    name=f"{first} {last}",
                    rating=5 if i % 3 != 0 else 4,
                    comment=comments[i % len(comments)],
                    location=locations[i % len(locations)],
                    is_active=True
                )
                db.add(testimonial)
            db.commit()

        # Ensure advisor login accounts exist
        default_password = settings.advisor_default_password or "advisor123"
        if not default_password.startswith("$2"):
            hashed_default_password = get_password_hash(default_password)
        else:
            hashed_default_password = default_password

        for advisor in db.query(Advisor).all():
            user = db.query(User).filter(User.username == advisor.email).first()
            if not user:
                user = User(
                    username=advisor.email,
                    hashed_password=hashed_default_password,
                    is_admin=False,
                    is_active=True
                )
                db.add(user)
                db.commit()
                db.refresh(user)

            existing_account = db.query(AdvisorAccount).filter(
                AdvisorAccount.advisor_id == advisor.id
            ).first()
            if not existing_account:
                account = AdvisorAccount(user_id=user.id, advisor_id=advisor.id)
                db.add(account)
                db.commit()
    finally:
        db.close()

# Email notification scheduler
@app.on_event("startup")
async def start_scheduler():
    scheduler.add_job(
        send_pending_notifications,
        trigger=IntervalTrigger(minutes=30),
        id="email_notifications",
        replace_existing=True
    )
    scheduler.add_job(
        sync_backup_database,
        trigger=IntervalTrigger(minutes=settings.backup_sync_interval_minutes),
        id="backup_sync",
        replace_existing=True
    )
    scheduler.start()

@app.on_event("shutdown")
async def shutdown_scheduler():
    scheduler.shutdown()

async def send_pending_notifications():
    """Send pending email notifications"""
    # This function would be implemented to send queued emails
    pass

# Authentication endpoints
@app.post("/api/auth/login", response_model=Token)
async def login(
    username: str = Form(...),
    password: str = Form(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    record_audit(db, "login", "user", entity_id=user.id, actor=user, request=request)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserInfo)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    advisor_account = db.query(AdvisorAccount).filter(AdvisorAccount.user_id == current_user.id).first()
    return UserInfo(
        id=current_user.id,
        username=current_user.username,
        is_admin=current_user.is_admin,
        advisor_id=advisor_account.advisor_id if advisor_account else None
    )

@app.post("/api/auth/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not verify_password(current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(new_password)
    db.commit()
    db.refresh(current_user)
    record_audit(db, "update", "user_password", entity_id=current_user.id, actor=current_user)
    return {"message": "Password updated successfully"}

@app.post("/api/auth/reset-password")
async def reset_password(
    token: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None)
    ).first()
    if not reset or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token is invalid or expired")

    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(new_password)
    reset.used_at = datetime.utcnow()
    db.commit()
    record_audit(db, "update", "user_password", entity_id=user.id, actor=user)
    return {"message": "Password reset successfully"}

# Website content management
@app.get("/api/content/{page}/{section}", response_model=WebsiteContentSchema)
async def get_content(page: str, section: str, db: Session = Depends(get_db)):
    content = db.query(WebsiteContent).filter(
        WebsiteContent.page == page, 
        WebsiteContent.section == section
    ).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content

@app.get("/api/content/{page}", response_model=List[WebsiteContentSchema])
async def get_page_content(page: str, db: Session = Depends(get_db)):
    contents = db.query(WebsiteContent).filter(WebsiteContent.page == page).all()
    return contents

@app.put("/api/content/{page}/{section}", response_model=WebsiteContentSchema)
async def update_content(
    page: str, 
    section: str, 
    content_data: dict, 
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    content = db.query(WebsiteContent).filter(
        WebsiteContent.page == page, 
        WebsiteContent.section == section
    ).first()
    created = False
    if not content:
        content = WebsiteContent(page=page, section=section, content=content_data)
        db.add(content)
        created = True
    else:
        content.content = content_data
    db.commit()
    db.refresh(content)
    record_audit(
        db,
        "create" if created else "update",
        "content",
        entity_id=content.id,
        actor=current_user,
        details={"page": page, "section": section},
        request=request
    )
    return content

# Email settings management
@app.get("/api/email-settings", response_model=EmailSettingsResponse)
async def get_email_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    settings_row = db.query(EmailSettings).first()
    if not settings_row:
        smtp_username = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_port_value = os.getenv("SMTP_PORT", "587")
        try:
            smtp_port = int(smtp_port_value)
        except ValueError:
            smtp_port = 587
        return EmailSettingsResponse(
            provider=os.getenv("SMTP_PROVIDER", "custom"),
            smtp_server=os.getenv("SMTP_SERVER", ""),
            smtp_port=smtp_port,
            smtp_username=smtp_username,
            use_tls=os.getenv("SMTP_USE_TLS", "true").lower() in ["true", "1", "yes"],
            from_name=os.getenv("FROM_NAME", "Gautam Insurance Agency"),
            from_email=os.getenv("FROM_EMAIL", smtp_username or None),
            forward_to_email=os.getenv("FORWARD_EMAIL", smtp_username or None),
            is_active=True,
            has_password=bool(smtp_password)
        )

    return EmailSettingsResponse(
        id=settings_row.id,
        provider=settings_row.provider,
        smtp_server=settings_row.smtp_server,
        smtp_port=settings_row.smtp_port,
        smtp_username=settings_row.smtp_username,
        use_tls=settings_row.use_tls,
        from_name=settings_row.from_name,
        from_email=settings_row.from_email,
        forward_to_email=settings_row.forward_to_email,
        is_active=settings_row.is_active,
        has_password=bool(settings_row.smtp_password_encrypted),
        updated_at=settings_row.updated_at
    )

@app.put("/api/email-settings", response_model=EmailSettingsResponse)
async def update_email_settings(
    payload: EmailSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    settings_row = db.query(EmailSettings).first()
    if not settings_row:
        settings_row = EmailSettings()
        db.add(settings_row)

    data = payload.dict(exclude_unset=True)
    smtp_password = data.pop("smtp_password", None)

    for key, value in data.items():
        setattr(settings_row, key, value)

    if smtp_password:
        settings_row.smtp_password_encrypted = encrypt_value(smtp_password)

    if settings_row.from_email is None and settings_row.smtp_username:
        settings_row.from_email = settings_row.smtp_username
    if settings_row.forward_to_email is None and settings_row.smtp_username:
        settings_row.forward_to_email = settings_row.smtp_username

    db.commit()
    db.refresh(settings_row)

    record_audit(
        db,
        "update",
        "email_settings",
        entity_id=settings_row.id,
        actor=current_user,
        details={"provider": settings_row.provider, "smtp_server": settings_row.smtp_server}
    )

    return EmailSettingsResponse(
        id=settings_row.id,
        provider=settings_row.provider,
        smtp_server=settings_row.smtp_server,
        smtp_port=settings_row.smtp_port,
        smtp_username=settings_row.smtp_username,
        use_tls=settings_row.use_tls,
        from_name=settings_row.from_name,
        from_email=settings_row.from_email,
        forward_to_email=settings_row.forward_to_email,
        is_active=settings_row.is_active,
        has_password=bool(settings_row.smtp_password_encrypted),
        updated_at=settings_row.updated_at
    )

# Advisors endpoints
@app.get("/api/advisors", response_model=List[AdvisorSchema])
async def get_advisors(db: Session = Depends(get_db)):
    advisors = db.query(Advisor).filter(Advisor.is_active == True).all()
    return advisors

@app.post("/api/advisors", response_model=AdvisorSchema)
async def create_advisor(
    advisor: AdvisorCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    db_advisor = Advisor(**advisor.dict())
    db.add(db_advisor)
    db.commit()
    db.refresh(db_advisor)

    default_password = settings.advisor_default_password or "advisor123"
    if not default_password.startswith("$2"):
        hashed_default_password = get_password_hash(default_password)
    else:
        hashed_default_password = default_password

    user = db.query(User).filter(User.username == db_advisor.email).first()
    if not user:
        user = User(
            username=db_advisor.email,
            hashed_password=hashed_default_password,
            is_admin=False,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    existing_account = db.query(AdvisorAccount).filter(
        AdvisorAccount.advisor_id == db_advisor.id
    ).first()
    if not existing_account:
        account = AdvisorAccount(user_id=user.id, advisor_id=db_advisor.id)
        db.add(account)
        db.commit()

    email_service.send_advisor_welcome(
        to_email=db_advisor.email,
        username=db_advisor.email,
        password=default_password if not default_password.startswith("$2") else "Use your existing password"
    )

    record_audit(db, "create", "advisor", entity_id=db_advisor.id, actor=current_user)
    return db_advisor

@app.put("/api/advisors/{advisor_id}", response_model=AdvisorSchema)
async def update_advisor(
    advisor_id: int,
    advisor_update: AdvisorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    advisor = db.query(Advisor).filter(Advisor.id == advisor_id).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    for key, value in advisor_update.dict(exclude_unset=True).items():
        setattr(advisor, key, value)
    
    db.commit()
    db.refresh(advisor)
    record_audit(db, "update", "advisor", entity_id=advisor.id, actor=current_user)
    return advisor

@app.post("/api/advisors/{advisor_id}/send-reset")
async def send_advisor_reset(
    advisor_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    advisor = db.query(Advisor).filter(Advisor.id == advisor_id).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")

    user = db.query(User).filter(User.username == advisor.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Advisor user not found")

    token = create_password_reset_token(db, user)
    reset_link = f"{request.base_url}reset-password.html?token={token}"
    email_service.send_password_reset(to_email=advisor.email, reset_link=reset_link)
    record_audit(db, "create", "password_reset", entity_id=user.id, actor=current_user)
    return {"message": "Password reset email sent"}

@app.delete("/api/advisors/{advisor_id}")
async def delete_advisor(
    advisor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    advisor = db.query(Advisor).filter(Advisor.id == advisor_id).first()
    if not advisor:
        raise HTTPException(status_code=404, detail="Advisor not found")
    
    db.delete(advisor)
    db.commit()
    record_audit(db, "delete", "advisor", entity_id=advisor_id, actor=current_user)
    return {"message": "Advisor deleted successfully"}

# Time slots endpoints
@app.get("/api/time-slots/{advisor_id}")
async def get_time_slots(advisor_id: int, date: str, db: Session = Depends(get_db)):
    """Get available time slots for an advisor on a specific date"""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
        slots = db.query(TimeSlot).filter(
            TimeSlot.advisor_id == advisor_id,
            TimeSlot.date == target_date,
            TimeSlot.is_available == True
        ).all()
        return slots
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

@app.post("/api/time-slots")
async def create_time_slots(
    advisor_id: int,
    date: str,
    times: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create time slots for an advisor"""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
        created_slots = []
        
        for time_str in times:
            # Check if slot already exists
            existing = db.query(TimeSlot).filter(
                TimeSlot.advisor_id == advisor_id,
                TimeSlot.date == target_date,
                TimeSlot.time == time_str
            ).first()
            
            if not existing:
                slot = TimeSlot(
                    advisor_id=advisor_id,
                    date=target_date,
                    time=time_str,
                    is_available=True
                )
                db.add(slot)
                created_slots.append(slot)
        
        db.commit()
        return {"message": f"Created {len(created_slots)} time slots", "slots": created_slots}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

# Consultation requests
@app.post("/api/consultations", response_model=ConsultationRequestSchema)
async def create_consultation(
    consultation: ConsultationRequestCreate,
    db: Session = Depends(get_db)
):
    db_consultation = ConsultationRequest(**consultation.dict())
    db.add(db_consultation)
    db.commit()
    db.refresh(db_consultation)
    
    # Send email notifications
    advisor = db.query(Advisor).filter(Advisor.id == consultation.advisor_id).first()
    if advisor:
        # Send notification to admin
        email_service.send_consultation_notification(
            consultation_data=consultation.dict(),
            consultation_id=db_consultation.id,
            advisor_name=advisor.name
        )
        
        # Send confirmation to client
        email_service.send_consultation_confirmation(
            client_email=consultation.email,
            consultation_data=consultation.dict(),
            advisor_name=advisor.name
        )
    
    return db_consultation

@app.get("/api/consultations")
async def get_consultations(
    status_filter: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    archived: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get consultations with filtering options"""
    query = db.query(ConsultationRequest)
    
    if status_filter:
        query = query.filter(ConsultationRequest.status == status_filter)
    
    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(ConsultationRequest.preferred_date >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d")
            query = query.filter(ConsultationRequest.preferred_date <= to_date)
        except ValueError:
            pass
    
    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id:
            raise HTTPException(status_code=403, detail="Advisor account not found")
        query = query.filter(ConsultationRequest.advisor_id == advisor_id)

    query = query.filter(ConsultationRequest.is_archived == archived)
    
    consultations = query.order_by(ConsultationRequest.preferred_date.asc()).all()
    return consultations

@app.put("/api/consultations/{consultation_id}")
async def update_consultation(
    consultation_id: int,
    status: str = Form(...),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update consultation status"""
    consultation = db.query(ConsultationRequest).filter(ConsultationRequest.id == consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id or consultation.advisor_id != advisor_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this consultation")
    
    consultation.status = status
    if notes:
        consultation.notes = notes
    
    # Archive if status is completed or cancelled
    if status in ['completed', 'cancelled'] and not consultation.is_archived:
        consultation.is_archived = True
        consultation.archived_at = datetime.utcnow()
    
    db.commit()
    db.refresh(consultation)
    record_audit(
        db,
        "update",
        "consultation",
        entity_id=consultation.id,
        actor=current_user,
        details={"status": status}
    )
    return consultation

# Insurance quotes with reason
@app.post("/api/quotes", response_model=InsuranceQuoteSchema)
async def create_quote(
    quote: InsuranceQuoteCreate,
    db: Session = Depends(get_db)
):
    # Calculate estimated premium based on insurance type and details
    estimated_premium = calculate_premium(quote.insurance_type, quote.details)
    
    # Add reason if provided
    reason = quote.details.get('reason', 'Not specified')
    
    db_quote = InsuranceQuote(
        **quote.dict(),
        estimated_premium=estimated_premium,
        reason=reason
    )
    db.add(db_quote)
    db.commit()
    db.refresh(db_quote)
    
    # Send email notifications
    email_service.send_quote_notification(
        quote_data=quote.dict(),
        quote_id=db_quote.id,
        estimated_premium=estimated_premium
    )
    
    # Send confirmation to client
    email_service.send_quote_confirmation(
        client_email=quote.email,
        quote_data=quote.dict(),
        quote_id=db_quote.id,
        estimated_premium=estimated_premium
    )
    
    return db_quote

def calculate_premium(insurance_type: str, details: dict) -> float:
    base_premiums = {
        "home": 1200,
        "auto": 1500,
        "life": 800,
        "commercial": 2500
    }
    
    base = base_premiums.get(insurance_type, 1000)
    
    # Adjust based on details
    if insurance_type == "home":
        home_value = details.get("home_value", 200000)
        base = (home_value / 200000) * base
    elif insurance_type == "auto":
        vehicle_age = details.get("vehicle_age", 5)
        base = base * (1 + (10 - vehicle_age) * 0.05)
    elif insurance_type == "life":
        age = details.get("age", 35)
        coverage = details.get("coverage_amount", 100000)
        base = (coverage / 100000) * base * (1 + (age - 30) * 0.02)
    elif insurance_type == "commercial":
        business_size = details.get("business_size", "small")
        if business_size == "medium":
            base *= 1.5
        elif business_size == "large":
            base *= 2.5
    
    return round(base, 2)

@app.get("/api/quotes")
async def get_quotes(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    insurance_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get quotes with filtering options"""
    query = db.query(InsuranceQuote)
    
    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(InsuranceQuote.created_at >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d")
            query = query.filter(InsuranceQuote.created_at <= to_date)
        except ValueError:
            pass
    
    if insurance_type:
        query = query.filter(InsuranceQuote.insurance_type == insurance_type)
    
    if status:
        query = query.filter(InsuranceQuote.status == status)
    
    quotes = query.order_by(InsuranceQuote.created_at.desc()).all()
    return quotes

@app.put("/api/quotes/{quote_id}")
async def update_quote(
    quote_id: int,
    status: str = Form(...),
    priority: Optional[str] = Form(None),
    assigned_to: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update quote status and assignment"""
    quote = db.query(InsuranceQuote).filter(InsuranceQuote.id == quote_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    quote.status = status
    if priority:
        quote.priority = priority
    if assigned_to:
        quote.assigned_to = assigned_to
    
    db.commit()
    db.refresh(quote)
    record_audit(
        db,
        "update",
        "quote",
        entity_id=quote.id,
        actor=current_user,
        details={"status": status, "priority": priority, "assigned_to": assigned_to}
    )
    return quote

# Quote reasons endpoints
@app.get("/api/quote-reasons")
async def get_quote_reasons(db: Session = Depends(get_db)):
    """Get all active quote reasons"""
    reasons = db.query(QuoteReason).filter(QuoteReason.is_active == True).all()
    return reasons

# Contact messages
@app.post("/api/contact", response_model=ContactMessageSchema)
async def create_contact(
    message: ContactMessageCreate,
    db: Session = Depends(get_db)
):
    db_message = ContactMessage(**message.dict())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    # Send email notification
    email_service.send_contact_notification(
        contact_data=message.dict(),
        message_id=db_message.id
    )
    
    return db_message

@app.get("/api/contact")
async def get_messages(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get contact messages with filtering options"""
    query = db.query(ContactMessage)
    
    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(ContactMessage.created_at >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d")
            query = query.filter(ContactMessage.created_at <= to_date)
        except ValueError:
            pass
    
    if status:
        query = query.filter(ContactMessage.status == status)
    
    messages = query.order_by(ContactMessage.created_at.desc()).all()
    return messages

@app.put("/api/contact/{message_id}")
async def update_message(
    message_id: int,
    status: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    message: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update contact message status"""
    db_message = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not db_message:
        raise HTTPException(status_code=404, detail="Message not found")

    updates = {}
    if status is not None:
        db_message.status = status
        updates["status"] = status
    if name is not None:
        db_message.name = name
        updates["name"] = name
    if email is not None:
        db_message.email = email
        updates["email"] = email
    if phone is not None:
        db_message.phone = phone
        updates["phone"] = phone
    if subject is not None:
        db_message.subject = subject
        updates["subject"] = subject
    if message is not None:
        db_message.message = message
        updates["message"] = message

    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    db.commit()
    db.refresh(db_message)
    record_audit(
        db,
        "update",
        "message",
        entity_id=db_message.id,
        actor=current_user,
        details=updates
    )
    return db_message

# Client profiles (advisor/admin)
@app.post("/api/clients", response_model=ClientProfileResponse)
async def create_client(
    payload: ClientProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    advisor_id = payload.advisor_id
    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id:
            raise HTTPException(status_code=403, detail="Advisor account not found")

    if not advisor_id and not current_user.is_admin:
        raise HTTPException(status_code=400, detail="Advisor is required for client")

    client = ClientProfile(
        advisor_id=advisor_id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        notes=payload.notes,
        id_expiration_date=payload.id_expiration_date,
        id_document_url=payload.id_document_url
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    record_audit(db, "create", "client", entity_id=client.id, actor=current_user)
    return client

@app.get("/api/clients", response_model=List[ClientProfileResponse])
async def get_clients(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(ClientProfile)
    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id:
            raise HTTPException(status_code=403, detail="Advisor account not found")
        query = query.filter(ClientProfile.advisor_id == advisor_id)
    return query.order_by(ClientProfile.created_at.desc()).all()

@app.put("/api/clients/{client_id}", response_model=ClientProfileResponse)
async def update_client(
    client_id: int,
    payload: ClientProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id or client.advisor_id != advisor_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this client")

    client.full_name = payload.full_name
    client.email = payload.email
    client.phone = payload.phone
    client.notes = payload.notes
    if current_user.is_admin and payload.advisor_id:
        client.advisor_id = payload.advisor_id
    client.id_expiration_date = payload.id_expiration_date
    client.id_document_url = payload.id_document_url

    db.commit()
    db.refresh(client)
    record_audit(db, "update", "client", entity_id=client.id, actor=current_user)
    return client

@app.post("/api/clients/{client_id}/id-upload", response_model=ClientProfileResponse)
async def upload_client_id(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id or client.advisor_id != advisor_id:
            raise HTTPException(status_code=403, detail="Not authorized to upload for this client")

    os.makedirs("../uploads/documents", exist_ok=True)
    filename = f"{uuid4()}_{file.filename}"
    file_path = f"../uploads/documents/{filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    client.id_document_url = f"/uploads/documents/{filename}"
    db.commit()
    db.refresh(client)
    record_audit(db, "update", "client", entity_id=client.id, actor=current_user)
    return client

@app.post("/api/clients/{client_id}/documents", response_model=ClientDocumentResponse)
async def upload_client_document(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id or client.advisor_id != advisor_id:
            raise HTTPException(status_code=403, detail="Not authorized to upload for this client")

    os.makedirs("../uploads/documents", exist_ok=True)
    filename = f"{uuid4()}_{file.filename}"
    file_path = f"../uploads/documents/{filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    document = ClientDocument(
        client_id=client.id,
        advisor_id=client.advisor_id,
        filename=filename,
        original_filename=file.filename,
        mime_type=file.content_type,
        url=f"/uploads/documents/{filename}"
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    record_audit(
        db,
        "create",
        "client_document",
        entity_id=document.id,
        actor=current_user,
        details={"client_id": client.id}
    )
    return document

@app.get("/api/clients/{client_id}/documents", response_model=List[ClientDocumentResponse])
async def list_client_documents(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = db.query(ClientProfile).filter(ClientProfile.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not current_user.is_admin:
        advisor_id = get_advisor_id_for_user(db, current_user)
        if not advisor_id or client.advisor_id != advisor_id:
            raise HTTPException(status_code=403, detail="Not authorized to view documents for this client")

    return db.query(ClientDocument).filter(ClientDocument.client_id == client_id).order_by(ClientDocument.created_at.desc()).all()

# Testimonials
@app.get("/api/testimonials", response_model=List[TestimonialSchema])
async def get_testimonials(db: Session = Depends(get_db)):
    testimonials = db.query(Testimonial).filter(Testimonial.is_active == True).all()
    return testimonials

@app.post("/api/testimonials", response_model=TestimonialSchema)
async def create_testimonial(
    testimonial: TestimonialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    db_testimonial = Testimonial(**testimonial.dict())
    db.add(db_testimonial)
    db.commit()
    db.refresh(db_testimonial)
    record_audit(db, "create", "testimonial", entity_id=db_testimonial.id, actor=current_user)
    return db_testimonial

@app.put("/api/testimonials/{testimonial_id}", response_model=TestimonialSchema)
async def update_testimonial(
    testimonial_id: int,
    testimonial_update: TestimonialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    testimonial = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    for key, value in testimonial_update.dict().items():
        setattr(testimonial, key, value)
    
    db.commit()
    db.refresh(testimonial)
    record_audit(db, "update", "testimonial", entity_id=testimonial.id, actor=current_user)
    return testimonial

@app.delete("/api/testimonials/{testimonial_id}")
async def delete_testimonial(
    testimonial_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    testimonial = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    
    db.delete(testimonial)
    db.commit()
    record_audit(db, "delete", "testimonial", entity_id=testimonial_id, actor=current_user)
    return {"message": "Testimonial deleted successfully"}

# Emergency contacts
@app.get("/api/emergency-contacts")
async def get_emergency_contacts(db: Session = Depends(get_db)):
    """Get all active emergency contacts"""
    contacts = db.query(EmergencyContact).filter(EmergencyContact.is_active == True).all()
    return contacts

@app.post("/api/emergency-contacts")
async def create_emergency_contact(
    contact: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create emergency contact (admin only)"""
    db_contact = EmergencyContact(**contact)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    record_audit(db, "create", "emergency_contact", entity_id=db_contact.id, actor=current_user)
    return db_contact

# Statistics endpoints
@app.get("/api/stats")
async def get_statistics(db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    """Get dashboard statistics"""
    today = datetime.utcnow().date()
    this_month = today.replace(day=1)
    
    stats = {
        "total_quotes": db.query(InsuranceQuote).count(),
        "quotes_today": db.query(InsuranceQuote).filter(
            InsuranceQuote.created_at >= today
        ).count(),
        "quotes_this_month": db.query(InsuranceQuote).filter(
            InsuranceQuote.created_at >= this_month
        ).count(),
        "pending_quotes": db.query(InsuranceQuote).filter(
            InsuranceQuote.status == "pending"
        ).count(),
        
        "total_consultations": db.query(ConsultationRequest).count(),
        "consultations_today": db.query(ConsultationRequest).filter(
            ConsultationRequest.created_at >= today
        ).count(),
        "pending_consultations": db.query(ConsultationRequest).filter(
            ConsultationRequest.status == "pending"
        ).count(),
        "scheduled_consultations": db.query(ConsultationRequest).filter(
            ConsultationRequest.status == "confirmed"
        ).count(),
        
        "total_messages": db.query(ContactMessage).count(),
        "unread_messages": db.query(ContactMessage).filter(
            ContactMessage.status == "unread"
        ).count(),
        
        "total_advisors": db.query(Advisor).filter(Advisor.is_active == True).count(),
        "total_testimonials": db.query(Testimonial).filter(Testimonial.is_active == True).count()
    }
    
    return stats

# File upload endpoint
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user)
):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    filename = f"{uuid4()}_{file.filename}"
    file_path = f"../uploads/images/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"filename": filename, "url": f"/uploads/images/{filename}"}

# Serve frontend
@app.get("/")
async def serve_home():
    return FileResponse("../frontend/index.html")

@app.get("/{page}")
async def serve_page(page: str):
    if page.endswith(".html"):
        page = page[:-5]
    if page in ["about", "services", "service", "contact", "admin", "reset-password"]:
        return FileResponse(f"../frontend/{page}.html")
    return FileResponse("../frontend/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
