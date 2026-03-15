// Shared brand loader for nav/footer logos

document.addEventListener('DOMContentLoaded', function() {
    loadBrand();
});

async function loadBrand() {
    const fallback = getDefaultBrand();
    try {
        const response = await fetch('/api/content/global/brand');
        if (response.ok) {
            const data = await response.json();
            const content = data.content || {};
            applyBrand({
                company_name: content.company_name || fallback.company_name,
                logo_url: content.logo_url || ''
            });
            return;
        }
    } catch (error) {
        console.error('Error loading brand:', error);
    }

    applyBrand(fallback);
}

function applyBrand(content) {
    const companyName = content.company_name || 'Gautam Insurance';
    const logoUrl = content.logo_url || '';

    document.querySelectorAll('.brand-name').forEach((el) => {
        el.textContent = companyName;
    });

    document.querySelectorAll('.brand-logo').forEach((img) => {
        if (logoUrl) {
            img.src = logoUrl;
            img.alt = `${companyName} logo`;
            img.style.display = '';
        } else {
            img.removeAttribute('src');
            img.style.display = 'none';
        }
    });
}

function getDefaultBrand() {
    return {
        company_name: 'Gautam Insurance',
        logo_url: ''
    };
}
