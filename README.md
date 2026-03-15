# Gautam Insurance Website

A fully dynamic, responsive insurance company website built with FastAPI backend and modern frontend technologies.

## 🚀 Features

### Frontend Features
- **Responsive Design**: Fully responsive across all devices (desktop, tablet, mobile)
- **Modern UI/UX**: Professional design with smooth animations and transitions
- **Interactive Quote Calculator**: Dynamic insurance quote system with real-time calculations
- **Contact Forms**: Multiple contact forms with validation and submission
- **Consultation Booking**: Schedule appointments with insurance advisors
- **Testimonials**: Display and manage client testimonials
- **Services Pages**: Detailed information about insurance services
- **Navigation**: Smooth scrolling navigation with active states

### Backend Features
- **FastAPI Backend**: High-performance Python web framework
- **Admin Dashboard**: Full-featured admin panel for content management
- **Authentication**: Secure JWT-based authentication system
- **Database**: SQLite database with SQLAlchemy ORM
- **Content Management**: Dynamic content editing for all website sections
- **File Upload**: Image and document upload functionality
- **API Endpoints**: RESTful API for all data operations
- **CORS Support**: Cross-origin resource sharing enabled

### Admin Features
- **Dashboard**: Overview statistics and recent activity
- **Content Management**: Edit website content dynamically
- **Advisor Management**: Add, edit, and delete insurance advisors
- **Quote Management**: View and manage insurance quotes
- **Consultation Management**: Manage consultation requests
- **Message Management**: View and respond to contact messages
- **Testimonial Management**: Manage client testimonials

## 🛠 Technology Stack

### Backend
- **FastAPI**: Modern, fast Python web framework
- **SQLAlchemy**: SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations
- **JWT**: JSON Web Tokens for authentication
- **Python-dotenv**: Environment variable management

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **JavaScript (ES6+)**: Vanilla JavaScript with modern features
- **Font Awesome**: Icon library
- **Google Fonts**: Inter font family

### Database
- **SQLite**: Lightweight, serverless database
- **Alembic**: Database migration tool (ready for use)

## 📁 Project Structure

```
gautam_insurance/
├── backend/
│   ├── app/
│   ├── models/
│   ├── routers/
│   ├── utils/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database configuration
│   ├── schemas.py           # Pydantic models
│   ├── auth.py              # Authentication logic
│   ├── requirements.txt     # Python dependencies
│   └── .env                 # Environment variables
├── frontend/
│   ├── index.html           # Homepage
│   ├── services.html        # Services page
│   ├── about.html           # About page
│   ├── contact.html         # Contact page
│   └── admin.html           # Admin dashboard
├── static/
│   ├── css/
│   │   ├── style.css        # Main stylesheet
│   │   └── admin.css        # Admin dashboard styles
│   └── js/
│       ├── main.js          # Main JavaScript
│       └── admin.js         # Admin dashboard JavaScript
├── uploads/
│   ├── images/
│   └── documents/
├── run.sh                   # Startup script
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)
- Modern web browser

### Installation

1. **Clone or download the project files**

2. **Navigate to the project directory**
   ```bash
   cd gautam_insurance
   ```

3. **Run the startup script** (Linux/Mac)
   ```bash
   ./run.sh
   ```

   Or manually:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Default Credentials
- **Admin Username**: `admin`
- **Admin Password**: `admin123`
- **Advisor Default Password**: `advisor123` (username is the advisor email)

### Access Points
- **Main Website**: http://localhost:8000
- **Admin Dashboard**: http://localhost:8000/admin.html
- **Services Page**: http://localhost:8000/services.html
- **About Page**: http://localhost:8000/about.html
- **Contact Page**: http://localhost:8000/contact.html
- **Password Reset**: http://localhost:8000/reset-password.html

## 🔧 Configuration

### Environment Variables
Edit the `.env` file in the backend directory to configure:
- `SECRET_KEY`: JWT secret key (change in production)
- `ENCRYPTION_KEY`: Optional key for encrypting stored credentials (leave blank to derive from `SECRET_KEY`)
- `ADMIN_USERNAME`: Default admin username
- `ADMIN_PASSWORD`: Default admin password (bcrypt hash or plain; plain will be hashed on startup)
- `ADVISOR_DEFAULT_PASSWORD`: Default password for auto-created advisor logins (default `advisor123`)
- `DATABASE_URL`: Database connection string
- `BACKUP_DATABASE_URL`: Backup database connection string
- `BACKUP_SYNC_INTERVAL_MINUTES`: Backup sync interval in minutes (default 60)

### Email Settings
You can configure email delivery either via environment variables or from the Admin Panel (Email Settings).
Environment variables (optional):
- `SMTP_PROVIDER`: `gmail`, `outlook`, or `custom`
- `SMTP_SERVER`: SMTP host (e.g., `smtp.gmail.com`)
- `SMTP_PORT`: SMTP port (e.g., `587`)
- `SMTP_USERNAME`: SMTP username / email
- `SMTP_PASSWORD`: SMTP password or app password
- `SMTP_USE_TLS`: `true` or `false`
- `FROM_NAME`: Email sender name
- `FROM_EMAIL`: Email sender address (defaults to `SMTP_USERNAME`)
- `FORWARD_EMAIL`: Inbox for admin notifications (defaults to `SMTP_USERNAME`)

### Database
The application uses SQLite by default. To use a different database:
1. Update the `DATABASE_URL` in `.env`
2. Install the appropriate database driver
3. Run migrations if needed

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Content Management
- `GET /api/content/{page}/{section}` - Get specific content
- `GET /api/content/{page}` - Get all content for a page
- `PUT /api/content/{page}/{section}` - Update content (admin only)

### Advisors
- `GET /api/advisors` - Get all advisors
- `POST /api/advisors` - Create advisor (admin only)
- `PUT /api/advisors/{id}` - Update advisor (admin only)
- `DELETE /api/advisors/{id}` - Delete advisor (admin only)

### Quotes
- `GET /api/quotes` - Get all quotes (admin only)
- `POST /api/quotes` - Create quote

### Consultations
- `GET /api/consultations` - Get all consultations (admin only)
- `POST /api/consultations` - Create consultation request

### Messages
- `GET /api/contact` - Get all messages (admin only)
- `POST /api/contact` - Create contact message

### Testimonials
- `GET /api/testimonials` - Get all testimonials
- `POST /api/testimonials` - Create testimonial (admin only)
- `PUT /api/testimonials/{id}` - Update testimonial (admin only)
- `DELETE /api/testimonials/{id}` - Delete testimonial (admin only)

### File Upload
- `POST /api/upload` - Upload image (admin only)

## 🎨 Customization

### Styling
- Main styles: `static/css/style.css`
- Admin styles: `static/css/admin.css`
- Modify CSS variables in `:root` for theme changes

### Content
- All content is managed through the admin dashboard
- Default content is automatically created on first run
- Content is stored in the database and can be edited dynamically

### Adding New Pages
1. Create HTML file in `frontend/` directory
2. Add navigation link
3. Create API endpoints if needed
4. Add JavaScript functionality

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS configuration
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- XSS protection through proper escaping

## 📱 Responsive Design

The website is fully responsive and optimized for:
- Desktop computers (1920px+)
- Laptops (1024px+)
- Tablets (768px+)
- Mobile phones (320px+)

## 🚀 Deployment

### Production Deployment
1. Change default admin credentials
2. Update `SECRET_KEY` in `.env`
3. Set `debug=False` in FastAPI app
4. Use a production server (gunicorn, uvicorn workers)
5. Configure reverse proxy (nginx, Apache)
6. Set up SSL/TLS certificates
7. Configure firewall and security headers

### Docker Deployment
A Dockerfile can be created for containerized deployment:
```dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔍 SEO Features

- Semantic HTML5 markup
- Meta tags for description and keywords
- Structured data support (ready for implementation)
- Clean URL structure
- Fast loading times
- Mobile-friendly design

## 📈 Analytics Ready

The website is prepared for analytics integration:
- Google Analytics 4
- Facebook Pixel
- Custom event tracking
- Form submission tracking

## 🛡 Insurance Features

### Quote Calculator
- Home insurance quotes
- Auto insurance quotes
- Life insurance quotes
- Premium estimation based on risk factors

### Coverage Types
- Homeowners insurance
- Renters insurance
- Auto insurance
- Life insurance
- Commercial insurance
- Liability coverage

### Claims Support
- 24/7 claims hotline
- Emergency contact information
- Claims process guidance
- Support ticket system

## 🤝 Support

For support or questions:
- Email: gautaminsuranceagency@gmail.com
- Phone: +1 (800) 555-0199
- Business Hours: Mon-Fri 8:30am-5:30pm

## 📄 License

This project is created for Gautam Insurance Agency. All rights reserved.

## 🙏 Acknowledgments

- FastAPI community for the excellent framework
- Font Awesome for the icon library
- Google Fonts for the typography
- All insurance partners and clients

---

**Built with ❤️ by Gautam Insurance Agency**

*Protecting what matters most to you since 1999*
# insurance
