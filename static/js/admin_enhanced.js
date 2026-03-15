// Enhanced Admin Dashboard JavaScript for Gautam Insurance

// Global variables
let authToken = localStorage.getItem('authToken');
let currentSection = 'dashboard';
let advisors = [];
let quotes = [];
let consultations = [];
let messages = [];
let testimonials = [];
let emergencyContacts = [];
let emailSettings = null;
let activeConsultationId = null;
let activeMessageId = null;
let currentUser = null;
let clients = [];
let contentCache = {
    hero: null,
    services: null,
    about: null
};

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

async function initializeAdmin() {
    if (authToken) {
        const isValid = await validateToken();
        if (isValid) {
            applyRolePermissions();
            const defaultSection = currentUser?.is_admin ? 'dashboard' : 'consultations';
            showDashboard(defaultSection);
            if (currentUser?.is_admin) {
                loadDashboardData();
            }
        } else {
            showLogin();
        }
    } else {
        showLogin();
    }
    
    initializeEventListeners();
}

function initializeEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Navigation items
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });
    
    // Content tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            showTab(tab);
        });
    });
    
    // Add new button
    const addNewBtn = document.getElementById('add-new-btn');
    if (addNewBtn) {
        addNewBtn.addEventListener('click', showAddModal);
    }

    const heroForm = document.getElementById('hero-content-form');
    if (heroForm) {
        heroForm.addEventListener('submit', handleHeroContentSubmit);
        heroForm.addEventListener('input', updateHeroPreviewFromForm);
    }

    const servicesForm = document.getElementById('services-content-form');
    if (servicesForm) {
        servicesForm.addEventListener('submit', handleServicesContentSubmit);
        servicesForm.addEventListener('input', updateServicesPreviewFromForm);
    }

    const aboutForm = document.getElementById('about-content-form');
    if (aboutForm) {
        aboutForm.addEventListener('submit', handleAboutContentSubmit);
        aboutForm.addEventListener('input', updateAboutPreviewFromForm);
    }

    const servicesList = document.getElementById('services-list');
    if (servicesList) {
        servicesList.addEventListener('click', handleServicesListClick);
        servicesList.addEventListener('input', updateServicesPreviewFromForm);
        servicesList.addEventListener('change', updateServicesPreviewFromForm);
        registerDragAndDrop('services-list', '.service-item', updateServicesPreviewFromForm);
    }

    const featuresList = document.getElementById('features-list');
    if (featuresList) {
        featuresList.addEventListener('click', handleFeaturesListClick);
        featuresList.addEventListener('input', updateAboutPreviewFromForm);
        featuresList.addEventListener('change', updateAboutPreviewFromForm);
        registerDragAndDrop('features-list', '.feature-item', updateAboutPreviewFromForm);
    }

    const emailSettingsForm = document.getElementById('email-settings-form');
    if (emailSettingsForm) {
        emailSettingsForm.addEventListener('submit', handleEmailSettingsSubmit);
    }

    const emailProvider = document.getElementById('email-provider');
    if (emailProvider) {
        emailProvider.addEventListener('change', handleEmailProviderChange);
    }

    const togglePreviewBtn = document.getElementById('toggle-preview-btn');
    if (togglePreviewBtn) {
        togglePreviewBtn.addEventListener('click', togglePreviewVisibility);
    }

    const consultationModalForm = document.getElementById('consultation-modal-form');
    if (consultationModalForm) {
        consultationModalForm.addEventListener('submit', handleConsultationStatusSubmit);
    }

    const messageModalForm = document.getElementById('message-modal-form');
    if (messageModalForm) {
        messageModalForm.addEventListener('submit', handleMessageUpdateSubmit);
    }

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePasswordSubmit);
    }

    document.addEventListener('click', (event) => {
        const uploadBtn = event.target.closest('[data-action="upload-advisor-image"]');
        if (uploadBtn) {
            const fileInput = document.getElementById('advisor-image-file');
            if (fileInput) {
                fileInput.click();
            }
        }

        const clientIdBtn = event.target.closest('[data-action="upload-client-id"]');
        if (clientIdBtn) {
            const fileInput = document.getElementById('client-id-file');
            if (fileInput) {
                fileInput.click();
            }
        }
    });

    document.addEventListener('change', (event) => {
        if (event.target && event.target.id === 'advisor-image-file') {
            handleAdvisorImageUpload(event);
        }

        if (event.target && event.target.id === 'client-id-file') {
            handleClientIdUpload(event);
        }
    });

    document.querySelectorAll('.stat-card[data-section]').forEach(card => {
        card.addEventListener('click', () => {
            const section = card.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
}

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            authToken = data.access_token;
            localStorage.setItem('authToken', authToken);

            await fetchCurrentUser();
            applyRolePermissions();
            const defaultSection = currentUser?.is_admin ? 'dashboard' : 'consultations';
            showDashboard(defaultSection);
            if (currentUser?.is_admin) {
                loadDashboardData();
            }
        } else {
            const error = document.getElementById('login-error');
            error.textContent = 'Invalid username or password';
            error.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = 'An error occurred. Please try again.';
        errorEl.style.display = 'block';
    }
}

async function validateToken() {
    const user = await fetchCurrentUser();
    return Boolean(user);
}

async function fetchCurrentUser() {
    if (!authToken) return null;
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        if (!response.ok) {
            return null;
        }
        currentUser = await response.json();
        return currentUser;
    } catch (error) {
        return null;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showLogin();
}

// UI State Management
function showLogin() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
}

function showDashboard(defaultSection = 'dashboard') {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    showSection(defaultSection);
}

function applyRolePermissions() {
    const isAdmin = currentUser?.is_admin;
    document.querySelectorAll('.admin-only').forEach(element => {
        element.style.display = isAdmin ? '' : 'none';
    });
}

function showSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
    
    // Update content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    const sectionEl = document.getElementById(`${sectionName}-section`);
    if (sectionEl) {
        sectionEl.style.display = 'block';
    }
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        content: 'Website Content',
        advisors: 'Advisors Management',
        quotes: 'Insurance Quotes',
        consultations: 'Consultations',
        clients: 'Clients',
        messages: 'Contact Messages',
        email: 'Email Settings',
        testimonials: 'Testimonials',
        emergency: 'Emergency Contacts',
        account: 'Account'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        titleEl.textContent = titles[sectionName] || '';
    }
    
    // Show/hide add button
    const addBtn = document.getElementById('add-new-btn');
    const showAddBtn = ['advisors', 'testimonials', 'emergency', 'clients'].includes(sectionName);
    if (addBtn) {
        addBtn.style.display = showAddBtn ? 'block' : 'none';
    }
    
    currentSection = sectionName;
    
    // Load section data
    loadSectionData(sectionName);
}

function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tabName}-tab`).style.display = 'block';
    
    // Load tab content
    loadContentData(tabName);
}

// Data Loading Functions
async function loadDashboardData() {
    if (!currentUser?.is_admin) {
        return;
    }
    try {
        const [advisorsRes, quotesRes, consultationsRes, messagesRes, statsRes] = await Promise.all([
            fetch('/api/advisors'),
            fetch('/api/quotes', { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch('/api/consultations', { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch('/api/contact', { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch('/api/stats', { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);
        
        if (advisorsRes.ok) advisors = await advisorsRes.json();
        if (quotesRes.ok) quotes = await quotesRes.json();
        if (consultationsRes.ok) consultations = await consultationsRes.json();
        if (messagesRes.ok) messages = await messagesRes.json();
        if (statsRes.ok) {
            const stats = await statsRes.json();
            updateDashboardStats(stats);
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateDashboardStats(stats) {
    document.getElementById('total-advisors').textContent = stats.total_advisors;
    document.getElementById('total-quotes').textContent = stats.total_quotes;
    document.getElementById('total-consultations').textContent = stats.total_consultations;
    document.getElementById('total-messages').textContent = stats.total_messages;
    const testimonialsCount = stats.total_testimonials || 0;
    const testimonialsDisplay = testimonialsCount >= 50 ? '50+' : testimonialsCount;
    const testimonialsEl = document.getElementById('total-testimonials');
    if (testimonialsEl) {
        testimonialsEl.textContent = testimonialsDisplay;
    }
    
    // Update recent activity
    updateRecentActivity(stats);
}

function updateRecentActivity(stats) {
    const activityList = document.getElementById('activity-list');
    
    const activities = [
        {
            type: 'quote',
            title: `${stats.quotes_today} quotes today`,
            description: `${stats.pending_quotes} pending`,
            time: 'Today'
        },
        {
            type: 'consultation',
            title: `${stats.consultations_today} consultations today`,
            description: `${stats.pending_consultations} pending`,
            time: 'Today'
        },
        {
            type: 'message',
            title: `${stats.unread_messages} unread messages`,
            description: 'Requires attention',
            time: 'Now'
        }
    ];
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-info">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        quote: 'calculator',
        consultation: 'calendar',
        message: 'envelope'
    };
    return icons[type] || 'bell';
}

async function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'advisors':
            await loadAdvisorsData();
            break;
        case 'quotes':
            await loadQuotesData();
            break;
        case 'consultations':
            await loadConsultationsData();
            break;
        case 'messages':
            await loadMessagesData();
            break;
        case 'clients':
            await loadClientsData();
            break;
        case 'email':
            await loadEmailSettings();
            break;
        case 'testimonials':
            await loadTestimonialsData();
            break;
        case 'emergency':
            await loadEmergencyContactsData();
            break;
        case 'content':
            await loadContentData();
            break;
    }
}

async function loadContentData(tabName = null) {
    const contentMap = {
        home: {
            page: 'home',
            section: 'hero',
            cacheKey: 'hero',
            handler: populateHeroForm
        },
        services: {
            page: 'home',
            section: 'services',
            cacheKey: 'services',
            handler: populateServicesForm
        },
        about: {
            page: 'home',
            section: 'why_choose_us',
            cacheKey: 'about',
            handler: populateAboutForm
        }
    };

    const tabsToLoad = tabName ? [tabName] : Object.keys(contentMap);

    await Promise.all(tabsToLoad.map(async (tab) => {
        const config = contentMap[tab];
        if (!config) return;

        try {
            const response = await fetch(`/api/content/${config.page}/${config.section}`);
            if (!response.ok) return;

            const data = await response.json();
            contentCache[config.cacheKey] = data.content || {};
            config.handler(data.content || {});
        } catch (error) {
            console.error(`Error loading content for ${tab}:`, error);
        }
    }));
}

function populateHeroForm(content) {
    const titleInput = document.getElementById('hero-title');
    const subtitleInput = document.getElementById('hero-subtitle');
    const ctaInput = document.getElementById('hero-cta');

    if (titleInput) titleInput.value = content.title || '';
    if (subtitleInput) subtitleInput.value = content.subtitle || '';
    if (ctaInput) ctaInput.value = content.cta_text || '';

    updateHeroPreviewFromForm();
}

function populateServicesForm(content) {
    const titleInput = document.getElementById('services-title');
    if (titleInput) titleInput.value = content.title || '';

    renderServicesEditor(Array.isArray(content.services) ? content.services : []);
    updateServicesPreviewFromForm();
}

function populateAboutForm(content) {
    const titleInput = document.getElementById('about-title');
    const descriptionInput = document.getElementById('about-description');

    if (titleInput) titleInput.value = content.title || '';
    if (descriptionInput) descriptionInput.value = content.description || '';

    renderFeaturesEditor(Array.isArray(content.features) ? content.features : []);
    updateAboutPreviewFromForm();
}

function renderServicesEditor(services) {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;

    servicesList.innerHTML = '';

    const safeServices = services.length ? services : [{ name: '', description: '', icon: '' }];
    safeServices.forEach((service) => addServiceItem(service));

    const actions = document.createElement('div');
    actions.className = 'list-actions';
    actions.innerHTML = '<button type="button" class="btn btn-secondary" data-action="add-service">Add Service</button>';
    servicesList.appendChild(actions);
}

function renderFeaturesEditor(features) {
    const featuresList = document.getElementById('features-list');
    if (!featuresList) return;

    featuresList.innerHTML = '';

    const safeFeatures = features.length ? features : [''];
    safeFeatures.forEach((feature) => addFeatureItem(feature));

    const actions = document.createElement('div');
    actions.className = 'list-actions';
    actions.innerHTML = '<button type="button" class="btn btn-secondary" data-action="add-feature">Add Feature</button>';
    featuresList.appendChild(actions);
}

function addServiceItem(service = {}) {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;

    const item = document.createElement('div');
    item.className = 'service-item draggable-item';
    item.setAttribute('draggable', 'true');
    item.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
            <i class="fas fa-grip-vertical"></i>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Service Name</label>
                <input type="text" data-field="name" value="${escapeHtml(service.name)}" required>
            </div>
            <div class="form-group">
                <label>Icon</label>
                <input type="text" data-field="icon" value="${escapeHtml(service.icon)}" placeholder="e.g., home, car">
            </div>
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea data-field="description" rows="2" required>${escapeHtml(service.description)}</textarea>
        </div>
        <button type="button" class="btn btn-danger" data-action="remove-service">Remove Service</button>
        <hr>
    `;

    const actions = servicesList.querySelector('.list-actions');
    if (actions) {
        servicesList.insertBefore(item, actions);
    } else {
        servicesList.appendChild(item);
    }
}

function addFeatureItem(feature = '') {
    const featuresList = document.getElementById('features-list');
    if (!featuresList) return;

    const item = document.createElement('div');
    item.className = 'feature-item draggable-item';
    item.setAttribute('draggable', 'true');
    item.innerHTML = `
        <div class="drag-handle" title="Drag to reorder">
            <i class="fas fa-grip-vertical"></i>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Feature</label>
                <input type="text" data-field="feature" value="${escapeHtml(feature)}" required>
            </div>
        </div>
        <button type="button" class="btn btn-danger" data-action="remove-feature">Remove Feature</button>
        <hr>
    `;

    const actions = featuresList.querySelector('.list-actions');
    if (actions) {
        featuresList.insertBefore(item, actions);
    } else {
        featuresList.appendChild(item);
    }
}

function handleServicesListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    if (button.dataset.action === 'add-service') {
        addServiceItem();
        updateServicesPreviewFromForm();
        return;
    }

    if (button.dataset.action === 'remove-service') {
        const item = button.closest('.service-item');
        if (item) item.remove();
        updateServicesPreviewFromForm();
    }
}

function handleFeaturesListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    if (button.dataset.action === 'add-feature') {
        addFeatureItem();
        updateAboutPreviewFromForm();
        return;
    }

    if (button.dataset.action === 'remove-feature') {
        const item = button.closest('.feature-item');
        if (item) item.remove();
        updateAboutPreviewFromForm();
    }
}

function collectServicesFromForm() {
    const services = [];
    document.querySelectorAll('#services-list .service-item').forEach((item) => {
        const name = item.querySelector('[data-field="name"]')?.value?.trim() || '';
        const description = item.querySelector('[data-field="description"]')?.value?.trim() || '';
        const icon = item.querySelector('[data-field="icon"]')?.value?.trim() || '';

        if (name || description || icon) {
            services.push({
                name,
                description,
                icon
            });
        }
    });

    return services;
}

function collectFeaturesFromForm() {
    const features = [];
    document.querySelectorAll('#features-list .feature-item').forEach((item) => {
        const value = item.querySelector('[data-field="feature"]')?.value?.trim();
        if (value) {
            features.push(value);
        }
    });
    return features;
}

async function handleHeroContentSubmit(event) {
    event.preventDefault();

    const content = {
        title: document.getElementById('hero-title')?.value?.trim() || '',
        subtitle: document.getElementById('hero-subtitle')?.value?.trim() || '',
        cta_text: document.getElementById('hero-cta')?.value?.trim() || ''
    };

    if (contentCache.hero?.background_image) {
        content.background_image = contentCache.hero.background_image;
    }

    const updated = await updateContent('home', 'hero', content);
    if (updated?.content) {
        contentCache.hero = updated.content;
    }
}

async function handleServicesContentSubmit(event) {
    event.preventDefault();

    const content = {
        title: document.getElementById('services-title')?.value?.trim() || '',
        services: collectServicesFromForm()
    };

    const updated = await updateContent('home', 'services', content);
    if (updated?.content) {
        contentCache.services = updated.content;
    }
}

async function handleAboutContentSubmit(event) {
    event.preventDefault();

    const content = {
        title: document.getElementById('about-title')?.value?.trim() || '',
        description: document.getElementById('about-description')?.value?.trim() || '',
        features: collectFeaturesFromForm()
    };

    const updated = await updateContent('home', 'why_choose_us', content);
    if (updated?.content) {
        contentCache.about = updated.content;
    }
}

async function updateContent(page, section, content) {
    if (!authToken) {
        showNotification('Please log in to update content.', 'error');
        showLogin();
        return null;
    }

    try {
        const response = await fetch(`/api/content/${page}/${section}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(content)
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('Content updated successfully!', 'success');
            return data;
        }

        if (response.status === 401) {
            showNotification('Session expired. Please log in again.', 'error');
            logout();
            return null;
        }

        showNotification('Failed to update content. Please try again.', 'error');
        return null;
    } catch (error) {
        console.error('Error updating content:', error);
        showNotification('An error occurred. Please try again.', 'error');
        return null;
    }
}

const EMAIL_PROVIDER_DEFAULTS = {
    gmail: {
        smtp_server: 'smtp.gmail.com',
        smtp_port: 587,
        use_tls: true
    },
    outlook: {
        smtp_server: 'smtp.office365.com',
        smtp_port: 587,
        use_tls: true
    }
};

async function loadEmailSettings() {
    if (!authToken) {
        showNotification('Please log in to view email settings.', 'error');
        showLogin();
        return;
    }

    try {
        const response = await fetch('/api/email-settings', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            emailSettings = await response.json();
            populateEmailSettingsForm(emailSettings);
            return;
        }

        if (response.status === 401) {
            showNotification('Session expired. Please log in again.', 'error');
            logout();
            return;
        }

        showNotification('Failed to load email settings.', 'error');
    } catch (error) {
        console.error('Error loading email settings:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

function populateEmailSettingsForm(settings) {
    if (!settings) return;

    const providerInput = document.getElementById('email-provider');
    const smtpServerInput = document.getElementById('smtp-server');
    const smtpPortInput = document.getElementById('smtp-port');
    const smtpUsernameInput = document.getElementById('smtp-username');
    const smtpPasswordInput = document.getElementById('smtp-password');
    const fromNameInput = document.getElementById('from-name');
    const fromEmailInput = document.getElementById('from-email');
    const forwardEmailInput = document.getElementById('forward-email');
    const useTlsInput = document.getElementById('smtp-use-tls');
    const passwordHint = document.getElementById('smtp-password-hint');

    if (providerInput) providerInput.value = settings.provider || 'custom';
    if (smtpServerInput) smtpServerInput.value = settings.smtp_server || '';
    if (smtpPortInput) smtpPortInput.value = settings.smtp_port || '';
    if (smtpUsernameInput) smtpUsernameInput.value = settings.smtp_username || '';
    if (smtpPasswordInput) smtpPasswordInput.value = '';
    if (fromNameInput) fromNameInput.value = settings.from_name || '';
    if (fromEmailInput) fromEmailInput.value = settings.from_email || '';
    if (forwardEmailInput) forwardEmailInput.value = settings.forward_to_email || '';
    if (useTlsInput) useTlsInput.checked = settings.use_tls !== false;

    if (passwordHint) {
        passwordHint.textContent = settings.has_password
            ? 'Password is already saved. Leave blank to keep the current password.'
            : 'Leave blank to keep the current password.';
    }
}

function handleEmailProviderChange() {
    const provider = document.getElementById('email-provider')?.value;
    const defaults = EMAIL_PROVIDER_DEFAULTS[provider];
    if (!defaults) return;

    const smtpServerInput = document.getElementById('smtp-server');
    const smtpPortInput = document.getElementById('smtp-port');
    const useTlsInput = document.getElementById('smtp-use-tls');

    if (smtpServerInput) smtpServerInput.value = defaults.smtp_server;
    if (smtpPortInput) smtpPortInput.value = defaults.smtp_port;
    if (useTlsInput) useTlsInput.checked = defaults.use_tls;
}

async function handleEmailSettingsSubmit(event) {
    event.preventDefault();

    const smtpPortValue = document.getElementById('smtp-port')?.value;
    const normalize = (value) => {
        const trimmed = value?.trim();
        return trimmed ? trimmed : undefined;
    };

    const payload = {
        provider: document.getElementById('email-provider')?.value || 'custom',
        smtp_server: normalize(document.getElementById('smtp-server')?.value),
        smtp_port: smtpPortValue ? Number(smtpPortValue) : undefined,
        smtp_username: normalize(document.getElementById('smtp-username')?.value),
        smtp_password: document.getElementById('smtp-password')?.value?.trim(),
        from_name: normalize(document.getElementById('from-name')?.value),
        from_email: normalize(document.getElementById('from-email')?.value),
        forward_to_email: normalize(document.getElementById('forward-email')?.value),
        use_tls: document.getElementById('smtp-use-tls')?.checked === true,
        is_active: true
    };

    if (!payload.smtp_password) {
        delete payload.smtp_password;
    }
    if (payload.smtp_port === undefined || Number.isNaN(payload.smtp_port)) {
        delete payload.smtp_port;
    }

    try {
        const response = await fetch('/api/email-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            emailSettings = await response.json();
            populateEmailSettingsForm(emailSettings);
            showNotification('Email settings updated successfully!', 'success');
            return;
        }

        if (response.status === 401) {
            showNotification('Session expired. Please log in again.', 'error');
            logout();
            return;
        }

        showNotification('Failed to update email settings.', 'error');
    } catch (error) {
        console.error('Error updating email settings:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

function updateHeroPreviewFromForm() {
    const title = document.getElementById('hero-title')?.value?.trim() || '';
    const subtitle = document.getElementById('hero-subtitle')?.value?.trim() || '';
    const cta = document.getElementById('hero-cta')?.value?.trim() || '';

    const titleEl = document.getElementById('preview-hero-title');
    const subtitleEl = document.getElementById('preview-hero-subtitle');
    const ctaEl = document.getElementById('preview-hero-cta');

    if (titleEl) titleEl.textContent = title || 'Hero Title';
    if (subtitleEl) subtitleEl.textContent = subtitle || 'Hero subtitle goes here.';
    if (ctaEl) ctaEl.textContent = cta || 'Call to Action';
}

function updateServicesPreviewFromForm() {
    const title = document.getElementById('services-title')?.value?.trim() || 'Services';
    const services = collectServicesFromForm();

    const titleEl = document.getElementById('preview-services-title');
    const listEl = document.getElementById('preview-services-list');

    if (titleEl) titleEl.textContent = title;
    if (!listEl) return;

    if (!services.length) {
        listEl.innerHTML = '<div class="preview-empty">No services added yet.</div>';
        return;
    }

    listEl.innerHTML = services.map(service => `
        <div class="preview-service-card">
            <div class="preview-service-icon">
                <i class="fas fa-${service.icon || 'shield-alt'}"></i>
            </div>
            <div>
                <strong>${escapeHtml(service.name || 'Service')}</strong>
                <p>${escapeHtml(service.description || '')}</p>
            </div>
        </div>
    `).join('');
}

function updateAboutPreviewFromForm() {
    const title = document.getElementById('about-title')?.value?.trim() || 'Why Choose Us';
    const description = document.getElementById('about-description')?.value?.trim() || '';
    const features = collectFeaturesFromForm();

    const titleEl = document.getElementById('preview-about-title');
    const descriptionEl = document.getElementById('preview-about-description');
    const listEl = document.getElementById('preview-features-list');

    if (titleEl) titleEl.textContent = title;
    if (descriptionEl) descriptionEl.textContent = description;
    if (!listEl) return;

    if (!features.length) {
        listEl.innerHTML = '<li class="preview-empty">No features added yet.</li>';
        return;
    }

    listEl.innerHTML = features.map(feature => `<li>${escapeHtml(feature)}</li>`).join('');
}

function togglePreviewVisibility() {
    const preview = document.getElementById('content-preview');
    const button = document.getElementById('toggle-preview-btn');
    if (!preview || !button) return;

    const isHidden = preview.classList.toggle('hidden');
    button.textContent = isHidden ? 'Show Preview' : 'Hide Preview';
}

let dragItem = null;

function registerDragAndDrop(listId, itemSelector, onReorder) {
    const list = document.getElementById(listId);
    if (!list) return;

    list.addEventListener('dragstart', (event) => {
        const item = event.target.closest(itemSelector);
        if (!item) return;
        dragItem = item;
        item.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', '');
    });

    list.addEventListener('dragover', (event) => {
        if (!dragItem) return;
        event.preventDefault();
        const target = event.target.closest(itemSelector);
        if (!target || target === dragItem) return;

        const rect = target.getBoundingClientRect();
        const shouldInsertAfter = event.clientY - rect.top > rect.height / 2;
        const referenceNode = shouldInsertAfter ? target.nextSibling : target;
        if (referenceNode !== dragItem) {
            list.insertBefore(dragItem, referenceNode);
        }
    });

    list.addEventListener('dragend', () => {
        if (dragItem) {
            dragItem.classList.remove('dragging');
            dragItem = null;
        }
        if (typeof onReorder === 'function') {
            onReorder();
        }
    });
}

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadAdvisorsData() {
    try {
        const response = await fetch('/api/advisors');
        if (response.ok) {
            advisors = await response.json();
            renderAdvisorsList();
        }
    } catch (error) {
        console.error('Error loading advisors:', error);
    }
}

function renderAdvisorsList() {
    const advisorsList = document.getElementById('advisors-list');
    advisorsList.innerHTML = advisors.map(advisor => `
        <div class="advisor-card">
            <div class="card-header">
                <h3>${advisor.name}</h3>
                <div class="card-actions">
                    <button class="action-btn edit" onclick="editAdvisor(${advisor.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn view" onclick="sendAdvisorReset(${advisor.id})" title="Send reset link">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteAdvisor(${advisor.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p><strong>Location:</strong> ${advisor.location}</p>
            <p><strong>Phone:</strong> ${advisor.phone}</p>
            <p><strong>Email:</strong> ${advisor.email}</p>
            <p><strong>Hours:</strong> ${advisor.hours}</p>
            <p><strong>Status:</strong> ${advisor.is_active ? 'Active' : 'Inactive'}</p>
            ${advisor.bio ? `<p><strong>Bio:</strong> ${advisor.bio}</p>` : ''}
        </div>
    `).join('');
}

async function loadQuotesData(date_from = null, date_to = null) {
    try {
        let url = '/api/quotes';
        const params = new URLSearchParams();
        if (date_from) params.append('date_from', date_from);
        if (date_to) params.append('date_to', date_to);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            quotes = await response.json();
            renderQuotesTable();
        }
    } catch (error) {
        console.error('Error loading quotes:', error);
    }
}

function renderQuotesTable() {
    const tableBody = document.getElementById('quotes-table-body');
    tableBody.innerHTML = quotes.map(quote => `
        <tr>
            <td>${quote.id}</td>
            <td>${quote.insurance_type}</td>
            <td>${quote.full_name}</td>
            <td>${quote.email}</td>
            <td>${quote.phone}</td>
            <td>${quote.estimated_premium !== null && quote.estimated_premium !== undefined ? `$${Number(quote.estimated_premium).toLocaleString()}` : 'N/A'}</td>
            <td>${quote.created_at ? new Date(quote.created_at).toLocaleDateString() : 'N/A'}</td>
            <td><span class="status ${quote.status}">${quote.status}</span></td>
            <td>
                <button class="action-btn view" onclick="viewQuote(${quote.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editQuote(${quote.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadConsultationsData(date_from = null, date_to = null, archived = false) {
    try {
        let url = '/api/consultations';
        const params = new URLSearchParams();
        if (date_from) params.append('date_from', date_from);
        if (date_to) params.append('date_to', date_to);
        if (archived) params.append('archived', 'true');
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            consultations = await response.json();
            renderConsultationsTable();
        }
    } catch (error) {
        console.error('Error loading consultations:', error);
    }
}

function renderConsultationsTable() {
    const tableBody = document.getElementById('consultations-table-body');
    tableBody.innerHTML = consultations.map(consultation => {
        const dateParts = [];
        if (consultation.preferred_date) {
            dateParts.push(new Date(consultation.preferred_date).toLocaleDateString());
        }
        if (consultation.preferred_time) {
            dateParts.push(consultation.preferred_time);
        }
        const displayDate = dateParts.length
            ? dateParts.join(' ')
            : (consultation.created_at ? new Date(consultation.created_at).toLocaleDateString() : 'N/A');

        return `
            <tr>
                <td>${consultation.id}</td>
                <td>${consultation.full_name}</td>
                <td>${consultation.email}</td>
                <td>${consultation.phone}</td>
                <td>${consultation.advisor?.name || 'N/A'}</td>
                <td>${consultation.discussion_topic}</td>
                <td>${displayDate}</td>
                <td><span class="status ${consultation.status}">${consultation.status}</span></td>
                <td>
                    <button class="action-btn view" onclick="viewConsultation(${consultation.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editConsultation(${consultation.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!consultation.is_archived ? `<button class="action-btn archive" onclick="archiveConsultation(${consultation.id})"><i class="fas fa-archive"></i></button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

async function loadMessagesData(date_from = null, date_to = null) {
    try {
        let url = '/api/contact';
        const params = new URLSearchParams();
        if (date_from) params.append('date_from', date_from);
        if (date_to) params.append('date_to', date_to);
        if (params.toString()) url += '?' + params.toString();
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            messages = await response.json();
            renderMessagesTable();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function renderMessagesTable() {
    const tableBody = document.getElementById('messages-table-body');
    tableBody.innerHTML = messages.map(message => `
        <tr>
            <td>${message.id}</td>
            <td>${message.name}</td>
            <td>${message.email}</td>
            <td>${message.phone || 'N/A'}</td>
            <td>${message.subject}</td>
            <td>${message.message.substring(0, 50)}...</td>
            <td>${new Date(message.created_at).toLocaleDateString()}</td>
            <td><span class="status ${message.status}">${message.status}</span></td>
            <td>
                <button class="action-btn view" onclick="viewMessage(${message.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit" onclick="editMessage(${message.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function loadTestimonialsData() {
    try {
        const response = await fetch('/api/testimonials');
        if (response.ok) {
            testimonials = await response.json();
            renderTestimonialsList();
        }
    } catch (error) {
        console.error('Error loading testimonials:', error);
    }
}

function renderTestimonialsList() {
    const testimonialsList = document.getElementById('testimonials-list');
    testimonialsList.innerHTML = testimonials.map(testimonial => `
        <div class="testimonial-card">
            <div class="card-header">
                <div>
                    <h3>${testimonial.name}</h3>
                    <div class="testimonial-rating">
                        ${'★'.repeat(testimonial.rating)}${'☆'.repeat(5 - testimonial.rating)}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="action-btn edit" onclick="editTestimonial(${testimonial.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteTestimonial(${testimonial.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="testimonial-text">"${testimonial.comment}"</p>
            ${testimonial.location ? `<p><strong>Location:</strong> ${testimonial.location}</p>` : ''}
            <p><strong>Status:</strong> ${testimonial.is_active ? 'Active' : 'Inactive'}</p>
        </div>
    `).join('');
}

async function loadEmergencyContactsData() {
    try {
        const response = await fetch('/api/emergency-contacts');
        if (response.ok) {
            emergencyContacts = await response.json();
            renderEmergencyContactsList();
        }
    } catch (error) {
        console.error('Error loading emergency contacts:', error);
    }
}

function renderEmergencyContactsList() {
    const container = document.getElementById('emergency-contacts-list');
    if (!container) return;
    
    container.innerHTML = emergencyContacts.map(contact => `
        <div class="contact-card">
            <div class="card-header">
                <h3>${contact.name}</h3>
                <div class="card-actions">
                    <button class="action-btn edit" onclick="editEmergencyContact(${contact.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteEmergencyContact(${contact.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p><strong>Phone:</strong> ${contact.phone}</p>
            <p><strong>Email:</strong> ${contact.email}</p>
            <p><strong>Description:</strong> ${contact.description}</p>
            <p><strong>Status:</strong> ${contact.is_active ? 'Active' : 'Inactive'}</p>
        </div>
    `).join('');
}

// CRUD Operations
function getSectionLabel(section) {
    const sectionLabels = {
        advisors: 'Advisor',
        testimonials: 'Testimonial',
        emergency: 'Emergency Contact',
        clients: 'Client'
    };

    return sectionLabels[section] || section;
}

function getSectionEndpoint(section) {
    if (section === 'emergency') {
        return '/api/emergency-contacts';
    }

    return `/api/${section}`;
}

function showAddModal() {
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('edit-form');
    const sectionLabel = getSectionLabel(currentSection);

    title.textContent = `Add New ${sectionLabel}`;
    
    // Generate form based on current section
    let formHTML = '';
    switch (currentSection) {
        case 'advisors':
            formHTML = generateAdvisorForm();
            break;
        case 'testimonials':
            formHTML = generateTestimonialForm();
            break;
        case 'emergency':
            formHTML = generateEmergencyContactForm();
            break;
        case 'clients':
            formHTML = generateClientForm();
            break;
    }
    
    form.innerHTML = formHTML;
    modal.style.display = 'block';

    if (currentSection === 'clients') {
        const clientIdFile = document.getElementById('client-id-file');
        if (clientIdFile) {
            clientIdFile.dataset.clientId = '';
        }
    }
    
    // Add form submission handler
    form.onsubmit = (e) => {
        e.preventDefault();
        handleAddSubmit();
    };
}

function generateAdvisorForm(advisor = null) {
    return `
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" value="${escapeHtml(advisor?.name)}" required>
        </div>
        <div class="form-group">
            <label for="location">Location</label>
            <input type="text" id="location" name="location" value="${escapeHtml(advisor?.location)}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="tel" id="phone" name="phone" value="${escapeHtml(advisor?.phone)}" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" value="${escapeHtml(advisor?.email)}" required>
            </div>
        </div>
        <div class="form-group">
            <label for="hours">Hours</label>
            <input type="text" id="hours" name="hours" value="${escapeHtml(advisor?.hours)}" required>
        </div>
        <div class="form-group">
            <label for="bio">Bio</label>
            <textarea id="bio" name="bio" rows="3">${escapeHtml(advisor?.bio)}</textarea>
        </div>
        <div class="form-group">
            <label for="image_url">Image URL</label>
            <input type="text" id="image_url" name="image_url" value="${escapeHtml(advisor?.image_url)}">
        </div>
        <div class="form-group">
            <label>Upload Image</label>
            <div class="upload-row">
                <button type="button" class="btn btn-secondary" data-action="upload-advisor-image">Choose Image</button>
                <input type="file" id="advisor-image-file" accept="image/*" hidden>
            </div>
            <div class="image-preview" id="advisor-image-preview">
                ${advisor?.image_url ? `<img src="${escapeHtml(advisor.image_url)}" alt="Advisor image preview">` : '<span>No image selected</span>'}
            </div>
        </div>
        <button type="submit" class="btn btn-primary">${advisor ? 'Update' : 'Add'} Advisor</button>
    `;
}

function generateTestimonialForm(testimonial = null) {
    const rating = testimonial?.rating || 5;
    return `
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" value="${escapeHtml(testimonial?.name)}" required>
        </div>
        <div class="form-group">
            <label for="rating">Rating</label>
            <select id="rating" name="rating" required>
                ${[1, 2, 3, 4, 5].map(value => `<option value="${value}" ${Number(rating) === value ? 'selected' : ''}>${value}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label for="comment">Comment</label>
            <textarea id="comment" name="comment" rows="3" required>${escapeHtml(testimonial?.comment)}</textarea>
        </div>
        <div class="form-group">
            <label for="location">Location</label>
            <input type="text" id="location" name="location" value="${escapeHtml(testimonial?.location)}">
        </div>
        <button type="submit" class="btn btn-primary">${testimonial ? 'Update' : 'Add'} Testimonial</button>
    `;
}

function generateEmergencyContactForm(contact = null) {
    return `
        <div class="form-group">
            <label for="name">Contact Name</label>
            <input type="text" id="name" name="name" value="${contact?.name || ''}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="tel" id="phone" name="phone" value="${contact?.phone || ''}" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" value="${contact?.email || ''}" required>
            </div>
        </div>
        <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="3" required>${contact?.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" id="is_active" name="is_active" ${contact?.is_active !== false ? 'checked' : ''}>
                Active
            </label>
        </div>
        <button type="submit" class="btn btn-primary">${contact ? 'Update' : 'Add'} Emergency Contact</button>
    `;
}

function generateClientForm(client = null) {
    return `
        <div class="form-group">
            <label for="full_name">Full Name</label>
            <input type="text" id="full_name" name="full_name" value="${escapeHtml(client?.full_name)}" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" value="${escapeHtml(client?.email)}">
            </div>
            <div class="form-group">
                <label for="phone">Phone</label>
                <input type="text" id="phone" name="phone" value="${escapeHtml(client?.phone)}">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="id_expiration_date">ID Expiration Date</label>
                <input type="date" id="id_expiration_date" name="id_expiration_date" value="${formatDateInput(client?.id_expiration_date)}">
            </div>
            <div class="form-group">
                <label for="id_document_url">ID Document URL</label>
                <input type="text" id="id_document_url" name="id_document_url" value="${escapeHtml(client?.id_document_url)}" placeholder="/uploads/documents/...">
            </div>
        </div>
        <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" rows="3">${escapeHtml(client?.notes)}</textarea>
        </div>
        <div class="form-group">
            <label>Upload ID Document</label>
            <div class="upload-row">
                <button type="button" class="btn btn-secondary" data-action="upload-client-id">Choose File</button>
                <input type="file" id="client-id-file" accept="image/*,.pdf" hidden>
            </div>
        </div>
        <button type="submit" class="btn btn-primary">${client ? 'Update' : 'Add'} Client</button>
    `;
}

async function handleAddSubmit() {
    const form = document.getElementById('edit-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Convert checkbox values
    const activeCheckbox = form.querySelector('input[name="is_active"]');
    if (activeCheckbox) {
        data.is_active = activeCheckbox.checked;
    } else {
        delete data.is_active;
    }
    if (data.rating !== undefined) {
        const ratingValue = Number(data.rating);
        if (!Number.isNaN(ratingValue)) {
            data.rating = ratingValue;
        }
    }
    if (data.id_expiration_date) {
        data.id_expiration_date = new Date(data.id_expiration_date).toISOString();
    }
    
    try {
        const endpoint = currentSection === 'clients' ? '/api/clients' : getSectionEndpoint(currentSection);
        const method = 'POST';
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            if (currentSection === 'clients') {
                const createdClient = await response.json();
                const clientIdFile = document.getElementById('client-id-file');
                if (clientIdFile && createdClient?.id) {
                    clientIdFile.dataset.clientId = createdClient.id;
                }
            }
            closeEditModal();
            loadSectionData(currentSection);
            showNotification(`${getSectionLabel(currentSection)} added successfully!`, 'success');
        } else {
            showNotification('Failed to add item. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error adding item:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

function closeEditModal() {
    document.getElementById('edit-modal').style.display = 'none';
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
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
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Export functions for global access
window.logout = logout;
window.closeConsultationModal = closeConsultationModal;
window.closeMessageModal = closeMessageModal;
window.editAdvisor = function(id) {
    const advisor = advisors.find(a => a.id === id);
    if (advisor) {
        showAddModal();
        document.getElementById('edit-form').innerHTML = generateAdvisorForm(advisor);
        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            // Handle update logic here
        };
    }
};
window.deleteAdvisor = async function(id) {
    if (confirm('Are you sure you want to delete this advisor?')) {
        try {
            const response = await fetch(`/api/advisors/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                loadSectionData('advisors');
                showNotification('Advisor deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting advisor:', error);
        }
    }
};

window.sendAdvisorReset = async function(id) {
    if (!confirm('Send a password reset link to this advisor?')) {
        return;
    }
    try {
        const response = await fetch(`/api/advisors/${id}/send-reset`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            showNotification('Password reset link sent!', 'success');
        } else {
            const error = await response.json();
            showNotification(error.detail || 'Failed to send reset link.', 'error');
        }
    } catch (error) {
        console.error('Error sending reset link:', error);
        showNotification('An error occurred while sending the reset link.', 'error');
    }
};

window.editQuote = function(id) {
    showNotification('Quote editing feature coming soon!', 'info');
};

window.viewQuote = function(id) {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
        alert(`Quote Details:\n\nID: ${quote.id}\nType: ${quote.insurance_type}\nName: ${quote.full_name}\nEmail: ${quote.email}\nPhone: ${quote.phone}\nPremium: $${quote.estimated_premium}\nReason: ${quote.reason || 'Not specified'}\nStatus: ${quote.status}\nCreated: ${new Date(quote.created_at).toLocaleDateString()}`);
    }
};

window.editConsultation = function(id) {
    const consultation = consultations.find(c => c.id === id);
    if (consultation) {
        openConsultationModal(consultation);
    }
};

window.viewConsultation = function(id) {
    const consultation = consultations.find(c => c.id === id);
    if (consultation) {
        openConsultationModal(consultation);
    }
};

window.archiveConsultation = async function(id) {
    if (confirm('Are you sure you want to archive this consultation?')) {
        await updateConsultationStatus(id, 'completed', true);
    }
};

async function updateConsultationStatus(id, status, archive = false) {
    try {
        const formData = new FormData();
        formData.append('status', status);
        
        const response = await fetch(`/api/consultations/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        
        if (response.ok) {
            loadSectionData('consultations');
            showNotification(`Consultation ${status} successfully!`, 'success');
        }
    } catch (error) {
        console.error('Error updating consultation:', error);
    }
}

function openConsultationModal(consultation) {
    const modal = document.getElementById('consultation-modal');
    const details = document.getElementById('consultation-modal-details');
    const statusSelect = document.getElementById('consultation-status');

    if (!modal || !details || !statusSelect) return;

    activeConsultationId = consultation.id;
    statusSelect.value = consultation.status || 'pending';

    const preferredDate = consultation.preferred_date
        ? new Date(consultation.preferred_date).toLocaleDateString()
        : 'Not set';
    const preferredTime = consultation.preferred_time || 'Not set';
    const createdAt = consultation.created_at
        ? new Date(consultation.created_at).toLocaleDateString()
        : 'N/A';

    details.innerHTML = `
        <div class="detail-item"><strong>ID:</strong> ${escapeHtml(consultation.id)}</div>
        <div class="detail-item"><strong>Name:</strong> ${escapeHtml(consultation.full_name)}</div>
        <div class="detail-item"><strong>Email:</strong> ${escapeHtml(consultation.email)}</div>
        <div class="detail-item"><strong>Phone:</strong> ${escapeHtml(consultation.phone)}</div>
        <div class="detail-item"><strong>Advisor:</strong> ${escapeHtml(consultation.advisor?.name || 'N/A')}</div>
        <div class="detail-item"><strong>Preferred Date:</strong> ${escapeHtml(preferredDate)}</div>
        <div class="detail-item"><strong>Preferred Time:</strong> ${escapeHtml(preferredTime)}</div>
        <div class="detail-item"><strong>Topic:</strong> ${escapeHtml(consultation.discussion_topic)}</div>
        <div class="detail-item"><strong>Status:</strong> ${escapeHtml(consultation.status)}</div>
        <div class="detail-item"><strong>Created:</strong> ${escapeHtml(createdAt)}</div>
    `;

    modal.style.display = 'block';
}

function closeConsultationModal() {
    const modal = document.getElementById('consultation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    activeConsultationId = null;
}

async function handleConsultationStatusSubmit(event) {
    event.preventDefault();
    if (!activeConsultationId) return;

    const status = document.getElementById('consultation-status')?.value;
    if (!status) return;

    await updateConsultationStatus(activeConsultationId, status);
    closeConsultationModal();
}

window.editMessage = function(id) {
    const message = messages.find(m => m.id === id);
    if (message) {
        openMessageModal(message);
    }
};

window.viewMessage = function(id) {
    const message = messages.find(m => m.id === id);
    if (message) {
        openMessageModal(message);
    }
};

async function updateMessageStatus(id, status) {
    await updateMessage(id, { status });
}

window.editTestimonial = function(id) {
    const testimonial = testimonials.find(t => t.id === id);
    if (testimonial) {
        showAddModal();
        document.getElementById('edit-form').innerHTML = generateTestimonialForm(testimonial);
        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            // Handle update logic here
        };
    }
};

function openMessageModal(message) {
    const modal = document.getElementById('message-modal');
    const details = document.getElementById('message-modal-details');
    if (!modal || !details) return;

    activeMessageId = message.id;

    document.getElementById('message-name').value = message.name || '';
    document.getElementById('message-email').value = message.email || '';
    document.getElementById('message-phone').value = message.phone || '';
    document.getElementById('message-subject').value = message.subject || '';
    document.getElementById('message-body').value = message.message || '';
    document.getElementById('message-status').value = message.status || 'unread';

    const createdAt = message.created_at
        ? new Date(message.created_at).toLocaleDateString()
        : 'N/A';

    details.innerHTML = `
        <div class="detail-item"><strong>ID:</strong> ${escapeHtml(message.id)}</div>
        <div class="detail-item"><strong>Created:</strong> ${escapeHtml(createdAt)}</div>
    `;

    modal.style.display = 'block';
}

function closeMessageModal() {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    activeMessageId = null;
}

async function handleMessageUpdateSubmit(event) {
    event.preventDefault();
    if (!activeMessageId) return;

    const payload = {
        name: document.getElementById('message-name')?.value?.trim(),
        email: document.getElementById('message-email')?.value?.trim(),
        phone: document.getElementById('message-phone')?.value?.trim(),
        subject: document.getElementById('message-subject')?.value?.trim(),
        message: document.getElementById('message-body')?.value?.trim(),
        status: document.getElementById('message-status')?.value
    };

    await updateMessage(activeMessageId, payload);
    closeMessageModal();
}

async function updateMessage(id, payload) {
    try {
        const formData = new FormData();
        Object.entries(payload || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        const response = await fetch(`/api/contact/${id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (response.ok) {
            loadSectionData('messages');
            showNotification('Message updated successfully!', 'success');
            return;
        }

        showNotification('Failed to update message.', 'error');
    } catch (error) {
        console.error('Error updating message:', error);
        showNotification('An error occurred while updating the message.', 'error');
    }
}

async function handleChangePasswordSubmit(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('current-password')?.value;
    const newPassword = document.getElementById('new-password')?.value;
    const confirmPassword = document.getElementById('confirm-password')?.value;

    if (!currentPassword || !newPassword) {
        showNotification('Please fill in all password fields.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('New password and confirmation do not match.', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('current_password', currentPassword);
        formData.append('new_password', newPassword);

        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (response.ok) {
            showNotification('Password updated successfully!', 'success');
            document.getElementById('change-password-form')?.reset();
            return;
        }

        const error = await response.json();
        showNotification(error.detail || 'Failed to update password.', 'error');
    } catch (error) {
        console.error('Error updating password:', error);
        showNotification('An error occurred while updating the password.', 'error');
    }
}

async function handleAdvisorImageUpload(event) {
    const fileInput = event.target;
    const file = fileInput.files?.[0];
    if (!file) {
        return;
    }

    if (!authToken) {
        showNotification('Please log in to upload images.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (!response.ok) {
            showNotification('Failed to upload image.', 'error');
            return;
        }

        const result = await response.json();
        const imageUrlInput = document.getElementById('image_url');
        if (imageUrlInput) {
            imageUrlInput.value = result.url;
        }

        const preview = document.getElementById('advisor-image-preview');
        if (preview) {
            preview.innerHTML = `<img src="${escapeHtml(result.url)}" alt="Advisor image preview">`;
        }

        showNotification('Image uploaded successfully!', 'success');
    } catch (error) {
        console.error('Error uploading image:', error);
        showNotification('An error occurred while uploading the image.', 'error');
    } finally {
        fileInput.value = '';
    }
}

async function handleClientIdUpload(event) {
    const fileInput = event.target;
    const file = fileInput.files?.[0];
    if (!file) {
        return;
    }

    const currentClientId = fileInput.dataset.clientId;
    if (!currentClientId) {
        showNotification('Save the client first before uploading ID.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/clients/${currentClientId}/id-upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (!response.ok) {
            showNotification('Failed to upload ID document.', 'error');
            return;
        }

        const updated = await response.json();
        const idUrlInput = document.getElementById('id_document_url');
        if (idUrlInput) {
            idUrlInput.value = updated.id_document_url || '';
        }

        showNotification('ID document uploaded successfully!', 'success');
    } catch (error) {
        console.error('Error uploading ID document:', error);
        showNotification('An error occurred while uploading the ID document.', 'error');
    } finally {
        fileInput.value = '';
    }
}

async function loadClientsData() {
    try {
        const response = await fetch('/api/clients', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            clients = await response.json();
            renderClientsList();
            const expired = clients.filter(client => isIdExpired(client.id_expiration_date));
            if (expired.length) {
                showNotification(`Warning: ${expired.length} client ID(s) are expired.`, 'warning');
            }
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function renderClientsList() {
    const clientsList = document.getElementById('clients-list');
    if (!clientsList) return;

    if (!clients.length) {
        clientsList.innerHTML = '<p>No clients added yet.</p>';
        return;
    }

    clientsList.innerHTML = clients.map(client => `
        <div class="client-card">
            <div class="card-header">
                <div>
                    <h3>${escapeHtml(client.full_name)}</h3>
                    <p class="client-meta">${escapeHtml(client.email || 'No email')} • ${escapeHtml(client.phone || 'No phone')}</p>
                </div>
            </div>
            <div class="client-id-row">
                <p><strong>ID Expiration:</strong> ${formatDateDisplay(client.id_expiration_date)}</p>
                <span class="expiry-badge ${isIdExpired(client.id_expiration_date) ? 'expired' : ''}">
                    ${isIdExpired(client.id_expiration_date) ? 'Expired' : 'Valid'}
                </span>
            </div>
            ${client.id_document_url ? `
                <p><strong>ID Document:</strong> <a href="${client.id_document_url}" target="_blank" rel="noopener noreferrer">View</a></p>
            ` : '<p><strong>ID Document:</strong> Not uploaded</p>'}
            ${client.notes ? `<p><strong>Notes:</strong> ${escapeHtml(client.notes)}</p>` : ''}
            <div class="client-documents" id="client-documents-${client.id}">
                <p class="client-documents-title"><strong>Documents</strong></p>
                <div class="client-documents-list">Loading documents...</div>
            </div>
            <div class="client-actions">
                <label class="btn btn-secondary btn-small">
                    Upload Document
                    <input type="file" data-client-id="${client.id}" class="client-document-input" hidden>
                </label>
                <label class="btn btn-secondary btn-small">
                    Upload ID
                    <input type="file" data-client-id="${client.id}" class="client-id-upload" accept="image/*,.pdf" hidden>
                </label>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.client-document-input').forEach(input => {
        input.addEventListener('change', handleClientDocumentUpload);
    });
    document.querySelectorAll('.client-id-upload').forEach(input => {
        input.addEventListener('change', async (event) => {
            const clientId = event.target.dataset.clientId;
            if (clientId) {
                await uploadClientIdFile(clientId, event.target.files?.[0]);
            }
            event.target.value = '';
        });
    });

    clients.forEach(client => {
        loadClientDocuments(client.id);
    });
}

async function loadClientDocuments(clientId) {
    const container = document.getElementById(`client-documents-${clientId}`);
    if (!container) return;

    try {
        const response = await fetch(`/api/clients/${clientId}/documents`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            container.querySelector('.client-documents-list').textContent = 'Failed to load documents.';
            return;
        }
        const documents = await response.json();
        const list = container.querySelector('.client-documents-list');
        if (!documents.length) {
            list.textContent = 'No documents uploaded yet.';
            return;
        }
        list.innerHTML = documents.map(doc => `
            <div class="client-document-item">
                <a href="${doc.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.original_filename)}</a>
                <span class="client-document-meta">${new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
        `).join('');
    } catch (error) {
        container.querySelector('.client-documents-list').textContent = 'Failed to load documents.';
    }
}

async function handleClientDocumentUpload(event) {
    const input = event.target;
    const clientId = input.dataset.clientId;
    const file = input.files?.[0];
    if (!clientId || !file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/clients/${clientId}/documents`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        if (response.ok) {
            showNotification('Document uploaded successfully!', 'success');
            await loadClientDocuments(clientId);
        } else {
            showNotification('Failed to upload document.', 'error');
        }
    } catch (error) {
        console.error('Error uploading document:', error);
        showNotification('An error occurred while uploading the document.', 'error');
    } finally {
        input.value = '';
    }
}

async function uploadClientIdFile(clientId, file) {
    if (!clientId || !file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/clients/${clientId}/id-upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        if (response.ok) {
            showNotification('ID uploaded successfully!', 'success');
            await loadClientsData();
        } else {
            showNotification('Failed to upload ID document.', 'error');
        }
    } catch (error) {
        console.error('Error uploading ID document:', error);
        showNotification('An error occurred while uploading the ID document.', 'error');
    }
}

function formatDateInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(value) {
    if (!value) return 'Not set';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString();
}

function isIdExpired(value) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

window.deleteTestimonial = async function(id) {
    if (confirm('Are you sure you want to delete this testimonial?')) {
        try {
            const response = await fetch(`/api/testimonials/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                loadSectionData('testimonials');
                showNotification('Testimonial deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting testimonial:', error);
        }
    }
};

window.editEmergencyContact = function(id) {
    const contact = emergencyContacts.find(c => c.id === id);
    if (contact) {
        showAddModal();
        document.getElementById('edit-form').innerHTML = generateEmergencyContactForm(contact);
        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            // Handle update logic here
        };
    }
};

window.deleteEmergencyContact = async function(id) {
    if (confirm('Are you sure you want to delete this emergency contact?')) {
        try {
            const response = await fetch(`/api/emergency-contacts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (response.ok) {
                loadSectionData('emergency');
                showNotification('Emergency contact deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting emergency contact:', error);
        }
    }
};

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const editModal = document.getElementById('edit-modal');
    if (editModal && event.target === editModal) {
        closeEditModal();
    }

    const consultationModal = document.getElementById('consultation-modal');
    if (consultationModal && event.target === consultationModal) {
        closeConsultationModal();
    }

    const messageModal = document.getElementById('message-modal');
    if (messageModal && event.target === messageModal) {
        closeMessageModal();
    }
});
