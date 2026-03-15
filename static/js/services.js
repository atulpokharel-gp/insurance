// Services listing page script

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadServicePages();
});

function initializeNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');

    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

async function loadServicePages() {
    const fallbackContent = getDefaultServicePagesContent();

    try {
        const response = await fetch('/api/content/services/pages');
        if (response.ok) {
            const data = await response.json();
            const content = data.content || {};
            const resolved = resolveServicePagesContent(content, fallbackContent);
            updateServiceHeader(resolved);
            renderServicePages(resolved.pages || []);
            return;
        }
    } catch (error) {
        console.error('Error loading service pages:', error);
    }

    updateServiceHeader(fallbackContent);
    renderServicePages(fallbackContent.pages || []);
}

function resolveServicePagesContent(content, fallback) {
    return {
        title: content.title !== undefined ? content.title : fallback.title,
        subtitle: content.subtitle !== undefined ? content.subtitle : fallback.subtitle,
        pages: Array.isArray(content.pages) ? content.pages : fallback.pages
    };
}

function updateServiceHeader(content) {
    const titleEl = document.getElementById('services-page-title');
    const subtitleEl = document.getElementById('services-page-subtitle');

    if (titleEl) titleEl.textContent = content.title || '';
    if (subtitleEl) subtitleEl.textContent = content.subtitle || '';
}

function renderServicePages(pages) {
    const grid = document.getElementById('service-pages-grid');
    if (!grid) return;

    if (!pages.length) {
        grid.innerHTML = '<div class="empty-state">No service pages have been added yet.</div>';
        return;
    }

    grid.innerHTML = pages.map((page, index) => {
        const title = page.title || 'Service';
        const slug = page.slug || slugify(title);
        const summary = page.summary || page.description || '';
        const description = truncateText(summary, 220);
        const highlights = Array.isArray(page.highlights) ? page.highlights : [];
        const link = `service.html?slug=${encodeURIComponent(slug)}`;
        const media = renderServiceMedia(page, title);
        const highlightMarkup = highlights.length
            ? `
                <div class="service-features">
                    <h3>Highlights</h3>
                    <ul>
                        ${highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                    </ul>
                </div>
            `
            : '';

        return `
            <div class="service-detail-card">
                ${media}
                <div class="service-content">
                    <h2>${escapeHtml(title)}</h2>
                    <p>${escapeHtml(description)}</p>
                    ${highlightMarkup}
                    <div class="service-cta">
                        <a class="btn btn-primary" href="${link}">View Details</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderServiceMedia(page, title) {
    const imageUrl = page.image_url || '';
    if (imageUrl) {
        return `
            <div class="service-media">
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)} image" loading="lazy">
            </div>
        `;
    }

    return `
        <div class="service-media">
            <span class="service-media-fallback">${escapeHtml(getInitials(title))}</span>
        </div>
    `;
}

function truncateText(text, maxLength) {
    const value = String(text || '').trim();
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3).trim()}...`;
}

function getInitials(title) {
    const words = String(title || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'GI';
    return words.slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase();
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
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

function getDefaultServicePagesContent() {
    return {
        title: 'Our Insurance Services',
        subtitle: 'Comprehensive coverage solutions tailored to protect what matters most to you.',
        pages: [
            {
                title: 'Home Insurance',
                slug: 'home-insurance',
                summary: 'Protect your most valuable asset with flexible coverage for homeowners and renters.',
                description: 'Protect your most valuable asset with comprehensive home insurance coverage. Whether you are a homeowner or renter, we offer policies that safeguard your property, belongings, and liability.',
                image_url: '',
                highlights: [
                    'Dwelling protection',
                    'Personal property coverage',
                    'Liability protection',
                    'Additional living expenses',
                    'Medical payments to others'
                ],
                cta_text: 'Get Home Insurance Quote',
                cta_link: 'index.html#quote'
            },
            {
                title: 'Auto Insurance',
                slug: 'auto-insurance',
                summary: 'Drive confidently with coverage options for individuals, families, and fleets.',
                description: 'Drive with confidence knowing you are protected on the road. Our auto insurance policies offer flexible coverage options for individuals, families, and fleets with competitive rates.',
                image_url: '',
                highlights: [
                    'Liability coverage',
                    'Collision coverage',
                    'Comprehensive coverage',
                    'Uninsured motorist protection',
                    'Personal injury protection'
                ],
                cta_text: 'Get Auto Insurance Quote',
                cta_link: 'index.html#quote'
            },
            {
                title: 'Life Insurance',
                slug: 'life-insurance',
                summary: 'Secure your family\'s future with term and whole life options.',
                description: 'Secure your family\'s financial future with life insurance policies designed to provide peace of mind. Choose from term life, whole life, and universal life options.',
                image_url: '',
                highlights: [
                    'Term life insurance',
                    'Whole life insurance',
                    'Universal life insurance',
                    'Final expense insurance',
                    'Group life insurance'
                ],
                cta_text: 'Get Life Insurance Quote',
                cta_link: 'index.html#quote'
            },
            {
                title: 'Commercial Insurance',
                slug: 'commercial-insurance',
                summary: 'Protect your business with comprehensive commercial insurance solutions.',
                description: 'Protect your business with comprehensive commercial insurance solutions. From small businesses to large enterprises, we have the coverage you need.',
                image_url: '',
                highlights: [
                    'General liability',
                    'Property insurance',
                    'Workers\' compensation',
                    'Professional liability',
                    'Cyber liability'
                ],
                cta_text: 'Schedule Consultation',
                cta_link: 'index.html#contact'
            }
        ]
    };
}
