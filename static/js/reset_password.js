document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const messageEl = document.getElementById('reset-message');

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        messageEl.textContent = 'Reset token is missing.';
        messageEl.style.display = 'block';
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-password')?.value;

        if (!newPassword || newPassword !== confirmPassword) {
            messageEl.textContent = 'Passwords do not match.';
            messageEl.style.display = 'block';
            return;
        }

        try {
            const formData = new FormData();
            formData.append('token', token);
            formData.append('new_password', newPassword);

            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (response.ok) {
                messageEl.textContent = result.message || 'Password updated successfully.';
                messageEl.style.display = 'block';
                messageEl.style.color = '#10b981';
                form.reset();
            } else {
                messageEl.textContent = result.detail || 'Failed to reset password.';
                messageEl.style.display = 'block';
            }
        } catch (error) {
            messageEl.textContent = 'An error occurred. Please try again.';
            messageEl.style.display = 'block';
        }
    });
});
