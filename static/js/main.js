// Main JavaScript for Gautam Insurance Website

// Global variables
let advisors = [];
let testimonials = [];
let services = [];
let partners = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Load all data
        await Promise.all([
            loadServices(),
            loadAdvisors(),
            loadTestimonials(),
            loadPartners()
        ]);
        
        // Initialize components
        initializeNavigation();
        initializeQuoteCalculator();
        initializeContactForm();
        initializeScrollAnimations();
        
        console.log('Gautam Insurance website initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Load partners data
async function loadPartners() {
    const fallbackContent = getDefaultPartnersContent();
    try {
        const response = await fetch('/api/content/home/partners');
        if (response.ok) {
            const data = await response.json();
            const content = data.content || {};
            const resolved = resolvePartnersContent(content, fallbackContent);
            partners = resolved.partners;
            updatePartnersHeader(resolved);
            renderPartners(false);
            return;
        }
    } catch (error) {
        console.error('Error loading partners:', error);
    }

    partners = fallbackContent.partners;
    updatePartnersHeader(fallbackContent);
    renderPartners(true);
}

function resolvePartnersContent(content, fallback) {
    return {
        title: content.title !== undefined ? content.title : fallback.title,
        subtitle: content.subtitle !== undefined ? content.subtitle : fallback.subtitle,
        partners: Array.isArray(content.partners) ? content.partners : []
    };
}

function updatePartnersHeader(content) {
    const titleEl = document.getElementById('partners-title');
    const subtitleEl = document.getElementById('partners-subtitle');
    if (titleEl) titleEl.textContent = content.title || '';
    if (subtitleEl) subtitleEl.textContent = content.subtitle || '';
}

function renderPartners(usingFallback = false) {
    const track = document.getElementById('partners-track');
    if (!track) return;

    const items = partners.length ? partners : [];
    const wrapper = track.parentElement;
    if (wrapper) {
        wrapper.classList.toggle('is-empty', !items.length && !usingFallback);
    }
    if (!items.length) {
        track.innerHTML = '';
        return;
    }

    const primaryMarkup = items.map((partner) => renderPartnerItem(partner, false)).join('');
    const duplicateMarkup = items.map((partner) => renderPartnerItem(partner, true)).join('');
    track.innerHTML = primaryMarkup + duplicateMarkup;
}

function renderPartnerItem(partner, isDuplicate) {
    const name = partner?.name?.trim() || 'Partner';
    const logoUrl = partner?.logo_url?.trim() || '';
    const website = partner?.website?.trim() || '';
    const initials = getPartnerInitials(name);
    const ariaHidden = isDuplicate ? ' aria-hidden="true"' : '';
    const logoMarkup = logoUrl
        ? `<img src="${logoUrl}" alt="${name} logo" loading="lazy">`
        : `<span class="partner-logo-fallback">${initials}</span>`;

    const innerMarkup = `
        <span class="partner-logo">${logoMarkup}</span>
        <span class="partner-name">${name}</span>
    `;

    if (website) {
        return `<a class="partner-item partner-link" href="${website}" target="_blank" rel="noopener"${ariaHidden}>${innerMarkup}</a>`;
    }

    return `<div class="partner-item"${ariaHidden}>${innerMarkup}</div>`;
}

function getPartnerInitials(name) {
    const words = name.split(/\s+/).filter(Boolean);
    if (!words.length) return 'GI';
    const initials = words.slice(0, 2).map((word) => word.charAt(0)).join('');
    return initials.toUpperCase();
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

function getDefaultPartnersContent() {
    return {
        title: 'We support the following company',
        subtitle: 'We work with trusted partners to provide more coverage choices for you.',
        partners: [
            { name: 'Progressive', logo_url: '', website: '' },
            { name: 'GEICO', logo_url: '', website: '' },
            { name: 'Foremost', logo_url: '', website: '' },
            { name: 'Guard', logo_url: '', website: '' },
            { name: 'Openly', logo_url: '', website: '' },
            { name: 'Hippo', logo_url: '', website: '' },
            { name: 'National General Insurance', logo_url: '', website: '' },
            { name: 'Branch', logo_url: '', website: '' },
            { name: 'Berkshire Hathaway Homestate Company', logo_url: '', website: '' },
            { name: 'Root', logo_url: '', website: '' },
            { name: 'NEXT', logo_url: '', website: '' }
        ]
    };
}

// Load services data
async function loadServices() {
    try {
        const response = await fetch('/api/content/home/services');
        if (response.ok) {
            const data = await response.json();
            services = data.content.services || [];
            renderServices();
        } else {
            // Use default services if API fails
            services = [
                {
                    name: "Home Insurance",
                    description: "Protect your property with coverage built for homeowners and renters alike.",
                    icon: "home",
                    slug: "home-insurance"
                },
                {
                    name: "Auto Insurance",
                    description: "Drive confidently with flexible plans for individuals, families, and fleets.",
                    icon: "car",
                    slug: "auto-insurance"
                },
                {
                    name: "Life Insurance",
                    description: "Secure your loved ones' future with customizable term and whole life policies.",
                    icon: "heart",
                    slug: "life-insurance"
                }
            ];
            renderServices();
        }
    } catch (error) {
        console.error('Error loading services:', error);
        renderServices();
    }
}

function renderServices() {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    
    servicesGrid.innerHTML = services.map(service => `
        <div class="service-card">
            <div class="service-icon">
                <i class="fas fa-${service.icon || 'shield-alt'}"></i>
            </div>
            <h3>${service.name}</h3>
            <p>${service.description}</p>
            <a class="btn btn-outline btn-small" href="${getServiceLink(service)}">Learn More</a>
        </div>
    `).join('');
}

function getServiceLink(service) {
    const slug = service?.slug?.trim() || slugify(service?.name || '');
    if (!slug) {
        return 'services.html';
    }
    return `service.html?slug=${encodeURIComponent(slug)}`;
}

// Load advisors data
async function loadAdvisors() {
    try {
        const response = await fetch('/api/advisors');
        if (response.ok) {
            advisors = await response.json();
            renderAdvisors();
            populateAdvisorsSelect();
        } else {
            console.error('Failed to load advisors');
        }
    } catch (error) {
        console.error('Error loading advisors:', error);
    }
}

function renderAdvisors() {
    const advisorsGrid = document.getElementById('advisors-grid');
    if (!advisorsGrid) return;
    
    advisorsGrid.innerHTML = advisors.map(advisor => `
        <div class="advisor-card">
            <div class="advisor-avatar">
                <i class="fas fa-user-tie"></i>
            </div>
            <h3>${advisor.name}</h3>
            <div class="advisor-location">${advisor.location}</div>
            <div class="advisor-details">
                <p><i class="fas fa-phone"></i> ${advisor.phone}</p>
                <p><i class="fas fa-envelope"></i> ${advisor.email}</p>
                <p><i class="fas fa-clock"></i> ${advisor.hours}</p>
            </div>
            <div class="advisor-bio">${advisor.bio || 'Experienced insurance advisor dedicated to helping clients find the perfect coverage.'}</div>
            <button class="btn btn-primary btn-small" onclick="scheduleWithAdvisor(${advisor.id})">
                Schedule with ${advisor.name.split(' ')[0]}
            </button>
        </div>
    `).join('');
}

function populateAdvisorsSelect() {
    const select = document.getElementById('consult-advisor');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select an Advisor</option>' + 
        advisors.map(advisor => `<option value="${advisor.id}">${advisor.name}</option>`).join('');
}

// Load testimonials data
async function loadTestimonials() {
    try {
        const response = await fetch('/api/testimonials');
        if (response.ok) {
            testimonials = await response.json();
            renderTestimonials();
        } else {
            console.error('Failed to load testimonials');
        }
    } catch (error) {
        console.error('Error loading testimonials:', error);
    }
}

function renderTestimonials() {
    const testimonialsGrid = document.getElementById('testimonials-grid');
    if (!testimonialsGrid) return;
    
    testimonialsGrid.innerHTML = testimonials.map(testimonial => `
        <div class="testimonial-card">
            <div class="testimonial-rating">
                ${'★'.repeat(testimonial.rating)}${'☆'.repeat(5 - testimonial.rating)}
            </div>
            <div class="testimonial-text">
                "${testimonial.comment}"
            </div>
            <div class="testimonial-author">
                <div class="testimonial-avatar">
                    ${testimonial.name.charAt(0)}
                </div>
                <div class="testimonial-info">
                    <h4>${testimonial.name}</h4>
                    <p>${testimonial.location || 'Happy Client'}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Quote Calculator functionality
function initializeQuoteCalculator() {
    const insuranceTypeSelect = document.getElementById('insurance-type');
    const quoteForm = document.getElementById('quote-form');
    
    if (insuranceTypeSelect) {
        insuranceTypeSelect.addEventListener('change', handleInsuranceTypeChange);
    }
    
    if (quoteForm) {
        quoteForm.addEventListener('submit', handleQuoteSubmit);
    }
}

function handleInsuranceTypeChange(event) {
    const insuranceType = event.target.value;
    const dynamicFields = document.getElementById('dynamic-fields');
    
    if (!dynamicFields) return;
    
    let fieldsHTML = '';
    
    switch (insuranceType) {
        case 'home':
            fieldsHTML = `
                <div class="form-group">
                    <label for="home-value">Home Value ($)</label>
                    <input type="number" id="home-value" name="home_value" placeholder="200000" required>
                </div>
                <div class="form-group">
                    <label for="home-type">Home Type</label>
                    <select id="home-type" name="home_type" required>
                        <option value="">Select Home Type</option>
                        <option value="single_family">Single Family</option>
                        <option value="condo">Condominium</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="mobile">Mobile Home</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="home-age">Year Built</label>
                    <input type="number" id="home-age" name="year_built" placeholder="2000" required>
                </div>
            `;
            break;
        case 'auto':
            fieldsHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="vehicle-year">Vehicle Year</label>
                        <input type="number" id="vehicle-year" name="vehicle_year" placeholder="2020" required>
                    </div>
                    <div class="form-group">
                        <label for="vehicle-make">Make</label>
                        <input type="text" id="vehicle-make" name="vehicle_make" placeholder="Toyota" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="vehicle-model">Model</label>
                        <input type="text" id="vehicle-model" name="vehicle_model" placeholder="Camry" required>
                    </div>
                    <div class="form-group">
                        <label for="driver-age">Driver Age</label>
                        <input type="number" id="driver-age" name="driver_age" placeholder="30" required>
                    </div>
                </div>
            `;
            break;
        case 'life':
            fieldsHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="age">Age</label>
                        <input type="number" id="age" name="age" placeholder="35" required>
                    </div>
                    <div class="form-group">
                        <label for="coverage">Coverage Amount ($)</label>
                        <select id="coverage" name="coverage_amount" required>
                            <option value="">Select Coverage</option>
                            <option value="100000">$100,000</option>
                            <option value="250000">$250,000</option>
                            <option value="500000">$500,000</option>
                            <option value="1000000">$1,000,000</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="term">Policy Term</label>
                    <select id="term" name="policy_term" required>
                        <option value="">Select Term</option>
                        <option value="10">10 Years</option>
                        <option value="20">20 Years</option>
                        <option value="30">30 Years</option>
                        <option value="whole">Whole Life</option>
                    </select>
                </div>
            `;
            break;
        default:
            fieldsHTML = '';
    }
    
    dynamicFields.innerHTML = fieldsHTML;
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    const insuranceType = data.insurance_type;
    const details = {};
    const numericFields = new Set([
        'home_value',
        'year_built',
        'vehicle_year',
        'driver_age',
        'age',
        'coverage_amount'
    ]);
    
    // Add dynamic fields based on insurance type
    const dynamicFields = document.querySelectorAll('#dynamic-fields input, #dynamic-fields select');
    dynamicFields.forEach(field => {
        const value = field.value;
        if (!value) return;
        if (numericFields.has(field.name)) {
            const numberValue = Number(value);
            details[field.name] = Number.isNaN(numberValue) ? value : numberValue;
        } else {
            details[field.name] = value;
        }
    });
    
    if (data.reason) {
        details.reason = data.reason;
    }
    
    if (details.vehicle_year) {
        const currentYear = new Date().getFullYear();
        const vehicleYear = Number(details.vehicle_year);
        if (!Number.isNaN(vehicleYear) && vehicleYear > 0) {
            details.vehicle_age = Math.max(0, currentYear - vehicleYear);
        }
    }
    
    const payload = {
        insurance_type: insuranceType,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        details: details
    };
    
    try {
        const response = await fetch('/api/quotes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            showQuoteResult(result.estimated_premium);
            
            // Show success message
            showNotification('Quote request submitted successfully! Check your email for confirmation.', 'success');
        } else {
            const error = await response.json();
            showNotification('Failed to submit quote: ' + (error.detail || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error submitting quote:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

function showQuoteResult(premium) {
    const quoteForm = document.getElementById('quote-form');
    const quoteResult = document.getElementById('quote-result');
    const premiumAmount = document.getElementById('premium-amount');
    
    if (quoteForm && quoteResult && premiumAmount) {
        quoteForm.style.display = 'none';
        quoteResult.style.display = 'block';
        premiumAmount.textContent = premium.toLocaleString();
    }
}

// Contact form functionality
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    const consultationForm = document.getElementById('consultation-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    
    if (consultationForm) {
        consultationForm.addEventListener('submit', handleConsultationSubmit);
    }
}

async function handleContactSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
            event.target.reset();
        } else {
            showNotification('Failed to send message. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error submitting contact form:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

async function handleConsultationSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch('/api/consultations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showNotification('Consultation request submitted successfully! Check your email for confirmation.', 'success');
            closeConsultationModal();
            event.target.reset();
        } else {
            const error = await response.json();
            showNotification('Failed to submit consultation: ' + (error.detail || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Error submitting consultation:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// Modal functionality
function scheduleWithAdvisor(advisorId) {
    const modal = document.getElementById('consultation-modal');
    const advisorSelect = document.getElementById('consult-advisor');
    
    if (modal && advisorSelect) {
        advisorSelect.value = advisorId;
        modal.style.display = 'block';
    }
}

function showConsultationForm() {
    const modal = document.getElementById('consultation-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeConsultationModal() {
    const modal = document.getElementById('consultation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Scroll animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.service-card, .advisor-card, .testimonial-card, .stat-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 2rem',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        zIndex: '10000',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const consultationModal = document.getElementById('consultation-modal');
    if (consultationModal && event.target === consultationModal) {
        closeConsultationModal();
    }
});

// Handle window resize for responsive behavior
window.addEventListener('resize', function() {
    const navMenu = document.getElementById('nav-menu');
    const hamburger = document.getElementById('hamburger');
    
    if (window.innerWidth > 768) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    }
});

// Export functions for global access
window.scheduleWithAdvisor = scheduleWithAdvisor;
window.showConsultationForm = showConsultationForm;
window.closeConsultationModal = closeConsultationModal;
