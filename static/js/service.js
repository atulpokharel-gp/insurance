// Service detail page script

document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadServiceDetail();
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

async function loadServiceDetail() {
    const slug = getSlugFromUrl();
    const fallbackContent = getDefaultServicePagesContent();

    try {
        const response = await fetch('/api/content/services/pages');
        if (response.ok) {
            const data = await response.json();
            const content = data.content || {};
            const resolved = resolveServicePagesContent(content, fallbackContent);
            const page = findServicePage(resolved.pages || [], slug);
            if (page) {
                renderServiceDetail(page);
                return;
            }
        }
    } catch (error) {
        console.error('Error loading service page:', error);
    }

    if (slug) {
        showNotFound();
        return;
    }

    const fallbackPage = fallbackContent.pages?.[0];
    if (fallbackPage) {
        renderServiceDetail(fallbackPage);
    } else {
        showNotFound();
    }
}

function resolveServicePagesContent(content, fallback) {
    return {
        title: content.title !== undefined ? content.title : fallback.title,
        subtitle: content.subtitle !== undefined ? content.subtitle : fallback.subtitle,
        pages: Array.isArray(content.pages) ? content.pages : fallback.pages
    };
}

function findServicePage(pages, slug) {
    if (!slug) return pages[0] || null;
    const normalized = slugify(slug);
    return pages.find((page) => {
        const pageSlug = page.slug ? slugify(page.slug) : slugify(page.title || '');
        return pageSlug === normalized;
    }) || null;
}

function renderServiceDetail(page) {
    const title = page.title || 'Service';
    const summary = page.summary || '';
    const description = page.description || summary || '';
    const highlights = Array.isArray(page.highlights) ? page.highlights : [];
    const imageUrl = page.image_url || '';
    const ctaText = page.cta_text || 'Get a Quote';
    const ctaLink = page.cta_link || 'index.html#quote';

    const headerTitle = document.getElementById('service-page-title');
    const headerSubtitle = document.getElementById('service-page-subtitle');
    if (headerTitle) headerTitle.textContent = title;
    if (headerSubtitle) headerSubtitle.textContent = summary || description;

    const titleEl = document.getElementById('service-title');
    if (titleEl) titleEl.textContent = title;

    const descriptionEl = document.getElementById('service-description');
    if (descriptionEl) {
        const paragraphs = String(description || '')
            .split(/\n+/)
            .map((text) => text.trim())
            .filter(Boolean);
        descriptionEl.innerHTML = paragraphs.length
            ? paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join('')
            : '<p>No description available.</p>';
    }

    const mediaEl = document.getElementById('service-media');
    if (mediaEl) {
        mediaEl.innerHTML = imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)} image" loading="lazy">`
            : `<span class="service-media-fallback">${escapeHtml(getInitials(title))}</span>`;
    }

    const highlightsEl = document.getElementById('service-highlights');
    if (highlightsEl) {
        if (!highlights.length) {
            highlightsEl.innerHTML = '';
        } else {
            highlightsEl.innerHTML = `
                <h3>Highlights</h3>
                <ul>
                    ${highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            `;
        }
    }

    const ctaEl = document.getElementById('service-cta');
    if (ctaEl) {
        ctaEl.textContent = ctaText;
        ctaEl.setAttribute('href', ctaLink);
    }
}

function showNotFound() {
    const detail = document.getElementById('service-detail');
    if (detail) {
        detail.style.display = 'none';
    }
    const fallback = document.getElementById('service-not-found');
    if (fallback) {
        fallback.style.display = 'block';
    }
}

function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    return slug ? slug.trim() : '';
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
            }
        ]
    };
}
