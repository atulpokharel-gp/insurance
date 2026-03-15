import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
from datetime import datetime
import os
from jinja2 import Template
import logging

from backend.database import SessionLocal
from backend.models import EmailSettings
from backend.security import decrypt_value

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME', 'atulpokharel10@gmail.com')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() in ['true', '1', 'yes']
        self.from_name = os.getenv('FROM_NAME', 'Gautam Insurance Agency')
        self.from_email = os.getenv('FROM_EMAIL', self.smtp_username)
        self.default_forward_email = os.getenv('FORWARD_EMAIL', self.smtp_username)

    def _load_settings_from_db(self) -> Optional[dict]:
        db = SessionLocal()
        try:
            settings = db.query(EmailSettings).filter(EmailSettings.is_active == True).first()
            if not settings:
                return None

            return {
                "provider": settings.provider,
                "smtp_server": settings.smtp_server,
                "smtp_port": settings.smtp_port,
                "smtp_username": settings.smtp_username,
                "smtp_password": decrypt_value(settings.smtp_password_encrypted),
                "use_tls": settings.use_tls,
                "from_name": settings.from_name,
                "from_email": settings.from_email,
                "forward_to_email": settings.forward_to_email
            }
        finally:
            db.close()

    def refresh_settings(self) -> None:
        settings = self._load_settings_from_db()
        if not settings:
            return

        self.smtp_server = settings.get("smtp_server") or self.smtp_server
        self.smtp_port = settings.get("smtp_port") or self.smtp_port
        self.smtp_username = settings.get("smtp_username") or self.smtp_username
        self.smtp_password = settings.get("smtp_password") or self.smtp_password
        self.use_tls = settings.get("use_tls", True)
        self.from_name = settings.get("from_name") or self.from_name
        self.from_email = settings.get("from_email") or self.smtp_username
        self.default_forward_email = settings.get("forward_to_email") or self.default_forward_email
        
    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        attachments: Optional[List[str]] = None,
        from_name: Optional[str] = None
    ) -> bool:
        """Send email using SMTP"""
        try:
            self.refresh_settings()
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            from_display = from_name or self.from_name
            from_email = self.from_email or self.smtp_username
            msg['From'] = f"{from_display} <{from_email}>"
            msg['To'] = to_email
            
            # Add text body
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)
            
            # Add HTML body if provided
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            
            # Add attachments if provided
            if attachments:
                for file_path in attachments:
                    with open(file_path, 'rb') as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                        encoders.encode_base64(part)
                        part.add_header(
                            'Content-Disposition',
                            f'attachment; filename= {os.path.basename(file_path)}'
                        )
                        msg.attach(part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_advisor_welcome(
        self,
        to_email: str,
        username: str,
        password: str
    ) -> bool:
        subject = "Your Advisor Portal Login - Gautam Insurance"
        body = f"""
Welcome to Gautam Insurance!

Your advisor account has been created.

Username: {username}
Temporary Password: {password}

Please log in and change your password right away.
        """
        return self.send_email(to_email=to_email, subject=subject, body=body)

    def send_password_reset(
        self,
        to_email: str,
        reset_link: str
    ) -> bool:
        subject = "Reset Your Password - Gautam Insurance"
        body = f"""
We received a request to reset your password.

Use this link to set a new password:
{reset_link}

If you did not request this, please ignore this email.
        """
        return self.send_email(to_email=to_email, subject=subject, body=body)
    
    def send_quote_notification(
        self,
        quote_data: dict,
        quote_id: int,
        estimated_premium: float
    ) -> bool:
        """Send notification for new insurance quote"""
        subject = f"New {quote_data['insurance_type'].title()} Insurance Quote - #{quote_id}"
        
        body = f"""
New Insurance Quote Request

Quote ID: #{quote_id}
Insurance Type: {quote_data['insurance_type'].title()}
Name: {quote_data['full_name']}
Email: {quote_data['email']}
Phone: {quote_data['phone']}
Reason: {quote_data.get('reason', 'Not specified')}
Estimated Premium: ${estimated_premium:,.2f}/year

Please follow up with the client within 24 hours.

Best regards,
Gautam Insurance Agency
        """
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a8a;">New Insurance Quote Request</h2>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Quote ID:</strong> #{quote_id}</p>
                    <p><strong>Insurance Type:</strong> {quote_data['insurance_type'].title()}</p>
                    <p><strong>Name:</strong> {quote_data['full_name']}</p>
                    <p><strong>Email:</strong> {quote_data['email']}</p>
                    <p><strong>Phone:</strong> {quote_data['phone']}</p>
                    <p><strong>Reason:</strong> {quote_data.get('reason', 'Not specified')}</p>
                    <p><strong>Estimated Premium:</strong> <span style="color: #10b981; font-size: 1.2em; font-weight: bold;">${estimated_premium:,.2f}/year</span></p>
                </div>
                <p style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <strong>Action Required:</strong> Please follow up with the client within 24 hours.
                </p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 0.9em;">
                    Best regards,<br>
                    <strong>Gautam Insurance Agency</strong><br>
                    7509E Main St, Suite 208, Reynoldsburg, OH 43068<br>
                    Phone: +1 (800) 555-0199
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=self.default_forward_email,
            subject=subject,
            body=body,
            html_body=html_body
        )
    
    def send_consultation_notification(
        self,
        consultation_data: dict,
        consultation_id: int,
        advisor_name: str
    ) -> bool:
        """Send notification for new consultation booking"""
        subject = f"New Consultation Booking - #{consultation_id}"
        
        preferred_date = consultation_data.get('preferred_date', 'Not specified')
        preferred_time = consultation_data.get('preferred_time', 'Not specified')
        
        body = f"""
New Consultation Booking

Consultation ID: #{consultation_id}
Client Name: {consultation_data['full_name']}
Email: {consultation_data['email']}
Phone: {consultation_data['phone']}
Preferred Advisor: {advisor_name}
Preferred Date: {preferred_date}
Preferred Time: {preferred_time}
Discussion Topic: {consultation_data['discussion_topic']}

Please confirm the appointment and prepare consultation materials.

Best regards,
Gautam Insurance Agency
        """
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a8a;">New Consultation Booking</h2>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Consultation ID:</strong> #{consultation_id}</p>
                    <p><strong>Client Name:</strong> {consultation_data['full_name']}</p>
                    <p><strong>Email:</strong> {consultation_data['email']}</p>
                    <p><strong>Phone:</strong> {consultation_data['phone']}</p>
                    <p><strong>Preferred Advisor:</strong> {advisor_name}</p>
                    <p><strong>Preferred Date:</strong> {preferred_date}</p>
                    <p><strong>Preferred Time:</strong> {preferred_time}</p>
                    <p><strong>Discussion Topic:</strong> {consultation_data['discussion_topic']}</p>
                </div>
                <p style="background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <strong>Action Required:</strong> Please confirm the appointment and prepare consultation materials.
                </p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 0.9em;">
                    Best regards,<br>
                    <strong>Gautam Insurance Agency</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=self.default_forward_email,
            subject=subject,
            body=body,
            html_body=html_body
        )
    
    def send_contact_notification(
        self,
        contact_data: dict,
        message_id: int
    ) -> bool:
        """Send notification for new contact message"""
        subject = f"New Contact Message - #{message_id}"
        
        body = f"""
New Contact Message

Message ID: #{message_id}
Name: {contact_data['name']}
Email: {contact_data['email']}
Phone: {contact_data.get('phone', 'Not provided')}
Subject: {contact_data['subject']}

Message:
{contact_data['message']}

Please respond to this inquiry within 24 hours.

Best regards,
Gautam Insurance Agency
        """
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a8a;">New Contact Message</h2>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Message ID:</strong> #{message_id}</p>
                    <p><strong>Name:</strong> {contact_data['name']}</p>
                    <p><strong>Email:</strong> {contact_data['email']}</p>
                    <p><strong>Phone:</strong> {contact_data.get('phone', 'Not provided')}</p>
                    <p><strong>Subject:</strong> {contact_data['subject']}</p>
                </div>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Message:</strong></p>
                    <p style="white-space: pre-wrap;">{contact_data['message']}</p>
                </div>
                <p style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <strong>Action Required:</strong> Please respond to this inquiry within 24 hours.
                </p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 0.9em;">
                    Best regards,<br>
                    <strong>Gautam Insurance Agency</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=self.default_forward_email,
            subject=subject,
            body=body,
            html_body=html_body
        )
    
    def send_consultation_confirmation(
        self,
        client_email: str,
        consultation_data: dict,
        advisor_name: str
    ) -> bool:
        """Send confirmation email to client for consultation booking"""
        subject = "Consultation Booking Confirmation - Gautam Insurance"
        
        preferred_date = consultation_data.get('preferred_date', 'Not specified')
        preferred_time = consultation_data.get('preferred_time', 'Not specified')
        
        body = f"""
Dear {consultation_data['full_name']},

Thank you for booking a consultation with Gautam Insurance Agency.

Consultation Details:
- Advisor: {advisor_name}
- Preferred Date: {preferred_date}
- Preferred Time: {preferred_time}
- Discussion Topic: {consultation_data['discussion_topic']}

Our team will contact you within 24 hours to confirm your appointment and provide any additional information you may need.

If you have any questions before your consultation, please feel free to contact us at:
- Phone: +1 (800) 555-0199
- Email: gautaminsuranceagency@gmail.com

We look forward to speaking with you!

Best regards,
Gautam Insurance Agency Team

7509E Main St, Suite 208
Reynoldsburg, OH 43068
        """
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a8a;">Consultation Booking Confirmation</h2>
                <p>Dear {consultation_data['full_name']},</p>
                <p>Thank you for booking a consultation with Gautam Insurance Agency.</p>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e3a8a; margin-top: 0;">Consultation Details</h3>
                    <p><strong>Advisor:</strong> {advisor_name}</p>
                    <p><strong>Preferred Date:</strong> {preferred_date}</p>
                    <p><strong>Preferred Time:</strong> {preferred_time}</p>
                    <p><strong>Discussion Topic:</strong> {consultation_data['discussion_topic']}</p>
                </div>
                
                <p>Our team will contact you within 24 hours to confirm your appointment and provide any additional information you may need.</p>
                
                <div style="background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Contact Information:</strong></p>
                    <p>Phone: +1 (800) 555-0199</p>
                    <p>Email: gautaminsuranceagency@gmail.com</p>
                </div>
                
                <p>We look forward to speaking with you!</p>
                
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 0.9em;">
                    Best regards,<br>
                    <strong>Gautam Insurance Agency Team</strong><br>
                    7509E Main St, Suite 208<br>
                    Reynoldsburg, OH 43068
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=client_email,
            subject=subject,
            body=body,
            html_body=html_body
        )
    
    def send_quote_confirmation(
        self,
        client_email: str,
        quote_data: dict,
        quote_id: int,
        estimated_premium: float
    ) -> bool:
        """Send confirmation email to client for quote request"""
        subject = "Quote Request Confirmation - Gautam Insurance"
        
        body = f"""
Dear {quote_data['full_name']},

Thank you for requesting an insurance quote from Gautam Insurance Agency.

Quote Details:
- Quote ID: #{quote_id}
- Insurance Type: {quote_data['insurance_type'].title()}
- Estimated Annual Premium: ${estimated_premium:,.2f}
- Reason: {quote_data.get('reason', 'Not specified')}

This is a preliminary estimate based on the information you provided. One of our licensed insurance advisors will contact you within 24 hours to discuss your specific needs and provide a detailed, personalized quote.

What happens next:
1. Our advisor will review your request
2. We'll contact you to gather any additional information needed
3. You'll receive a detailed quote tailored to your needs
4. We'll help you choose the best coverage options

If you have any questions before we contact you, please feel free to reach out:
- Phone: +1 (800) 555-0199
- Email: gautaminsuranceagency@gmail.com

Thank you for choosing Gautam Insurance Agency!

Best regards,
Gautam Insurance Agency Team

7509E Main St, Suite 208
Reynoldsburg, OH 43068
        """
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a8a;">Quote Request Confirmation</h2>
                <p>Dear {quote_data['full_name']},</p>
                <p>Thank you for requesting an insurance quote from Gautam Insurance Agency.</p>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e3a8a; margin-top: 0;">Quote Details</h3>
                    <p><strong>Quote ID:</strong> #{quote_id}</p>
                    <p><strong>Insurance Type:</strong> {quote_data['insurance_type'].title()}</p>
                    <p><strong>Estimated Annual Premium:</strong> <span style="color: #10b981; font-size: 1.2em; font-weight: bold;">${estimated_premium:,.2f}</span></p>
                    <p><strong>Reason:</strong> {quote_data.get('reason', 'Not specified')}</p>
                </div>
                
                <p>This is a preliminary estimate based on the information you provided. One of our licensed insurance advisors will contact you within 24 hours to discuss your specific needs and provide a detailed, personalized quote.</p>
                
                <div style="background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>What happens next:</strong></p>
                    <ol>
                        <li>Our advisor will review your request</li>
                        <li>We'll contact you to gather any additional information needed</li>
                        <li>You'll receive a detailed quote tailored to your needs</li>
                        <li>We'll help you choose the best coverage options</li>
                    </ol>
                </div>
                
                <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Contact Information:</strong></p>
                    <p>Phone: +1 (800) 555-0199</p>
                    <p>Email: gautaminsuranceagency@gmail.com</p>
                </div>
                
                <p>Thank you for choosing Gautam Insurance Agency!</p>
                
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 0.9em;">
                    Best regards,<br>
                    <strong>Gautam Insurance Agency Team</strong><br>
                    7509E Main St, Suite 208<br>
                    Reynoldsburg, OH 43068
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=client_email,
            subject=subject,
            body=body,
            html_body=html_body
        )
    
    def send_emergency_contact_info(
        self,
        to_email: str,
        emergency_contact: dict
    ) -> bool:
        """Send emergency contact information"""
        subject = "Emergency Contact Information - Gautam Insurance"
        
        body = f"""
Emergency Contact Information

Contact Name: {emergency_contact['name']}
Phone: {emergency_contact['phone']}
Email: {emergency_contact['email']}
Description: {emergency_contact['description']}

This contact is available for emergency situations outside of normal business hours.

For immediate assistance, please call our 24/7 claims hotline:
+1 (800) 555-CLAIM

Best regards,
Gautam Insurance Agency
        """
        
        return self.send_email(
            to_email=to_email,
            subject=subject,
            body=body
        )

# Global email service instance
email_service = EmailService()
