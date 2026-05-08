const API_BASE_URL = 'http://localhost:8000'; // FastAPI backend URL

// Setup event listeners based on the page
document.addEventListener('DOMContentLoaded', () => {
    // Common setup for auth forms
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuth);
    }

    const toggleModeBtn = document.getElementById('toggle-mode-btn');
    if (toggleModeBtn) {
        toggleModeBtn.addEventListener('click', toggleAuthMode);
    }

    // Index Page setup
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                const token = localStorage.getItem('access_token');
                if (token) {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'login.html';
                }
            });
        }
    }

    // Login Page setup
    if (window.location.pathname.endsWith('login.html')) {
        // 1. Check if returning from OAuth
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        
        if (params.get('access_token')) {
            localStorage.setItem('access_token', params.get('access_token'));
            window.location.hash = '';
            window.location.href = 'dashboard.html';
            return;
        }

        // 2. Check if already logged in
        const token = localStorage.getItem('access_token');
        if (token) {
            window.location.href = 'dashboard.html';
        }
    }

    // Dashboard Page setup
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
        // Fetch profile data on load
        fetchProfile();
    }
});

// --- Auth Logic ---

let isLoginMode = false; // Start in Sign Up mode since the template is "Create your account"

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleModeBtn = document.getElementById('toggle-mode-btn');
    const authTitle = document.getElementById('auth-title');
    const termsGroup = document.getElementById('terms-group');
    const termsCheckbox = document.getElementById('terms');
    
    if (isLoginMode) {
        authTitle.textContent = 'Welcome Back';
        submitBtn.textContent = 'Sign In';
        toggleModeBtn.textContent = 'Sign Up';
        if (termsGroup) termsGroup.style.display = 'none';
        if (termsCheckbox) termsCheckbox.removeAttribute('required');
    } else {
        authTitle.textContent = 'Create your account';
        submitBtn.textContent = 'Sign Up';
        toggleModeBtn.textContent = 'Sign In';
        if (termsGroup) termsGroup.style.display = 'flex';
        if (termsCheckbox) termsCheckbox.setAttribute('required', 'required');
    }
}

async function handleAuth(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('error-message');
    const submitBtn = document.getElementById('auth-submit-btn');

    errorEl.style.color = 'var(--error)';
    errorEl.textContent = '';
    const originalBtnText = submitBtn.textContent;
    submitBtn.innerHTML = '<div class="loader"></div>';
    submitBtn.disabled = true;

    const endpoint = isLoginMode ? '/login' : '/signup';

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            // Supabase errors are usually in data.detail.error_description or data.detail.message
            let errorMsg = 'Authentication failed';
            if (data.detail) {
                if (typeof data.detail === 'string') {
                    errorMsg = data.detail;
                } else if (data.detail.error_description) {
                    errorMsg = data.detail.error_description;
                } else if (data.detail.msg) {
                    errorMsg = data.detail.msg;
                }
            }
            throw new Error(errorMsg);
        }

        if (isLoginMode) {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                window.location.href = 'dashboard.html';
            } else {
                throw new Error("No access token received.");
            }
        } else {
            // Sign up successful
            errorEl.style.color = 'var(--success)';
            errorEl.textContent = 'Sign up successful! Please log in.';
            setTimeout(() => {
                errorEl.style.color = 'var(--error)';
                errorEl.textContent = '';
                toggleAuthMode();
            }, 3000);
        }

    } catch (error) {
        errorEl.style.color = 'var(--error)';
        errorEl.textContent = error.message;
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// --- Dashboard Logic ---

function showSection(sectionId) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-${sectionId}`).classList.add('active');

    // Update sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
        sec.classList.add('hidden');
    });

    const targetSection = document.getElementById(`${sectionId}-section`);
    targetSection.classList.remove('hidden');
    // Trigger reflow to restart animation
    void targetSection.offsetWidth;
    targetSection.classList.add('active');
}

async function fetchProfile() {
    const token = localStorage.getItem('access_token');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Session expired');
        }

        const data = await response.json();
        const user = data.user;
        const metadata = user.user_metadata || {};

        // Update Sidebar
        const displayName = metadata.full_name || 'User';
        document.getElementById('sidebar-name').textContent = displayName;
        document.getElementById('sidebar-email').textContent = user.email || 'No email provided';

        // Initials for Avatar
        const initials = displayName.substring(0, 2).toUpperCase();
        document.getElementById('sidebar-avatar').textContent = initials;

        // Update Overview Section
        document.getElementById('overview-role').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

        // Update Settings Form
        document.getElementById('profile-email-input').value = user.email || '';
        if (metadata.full_name) document.getElementById('full_name').value = metadata.full_name;
        if (metadata.phone) document.getElementById('phone').value = metadata.phone;
        if (metadata.bio) document.getElementById('bio').value = metadata.bio;

    } catch (error) {
        console.error('Error fetching profile:', error);
        logout();
    }
}

async function updateProfile(e) {
    e.preventDefault();

    const token = localStorage.getItem('access_token');
    if (!token) return logout();

    const msgEl = document.getElementById('profile-msg');
    const submitBtn = document.getElementById('save-profile-btn');

    const fullName = document.getElementById('full_name').value;
    const phone = document.getElementById('phone').value;
    const bio = document.getElementById('bio').value;

    // UI State: Loading
    msgEl.className = 'profile-msg';
    msgEl.textContent = '';
    const originalBtnText = submitBtn.textContent;
    submitBtn.innerHTML = '<div class="loader"></div>';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                full_name: fullName,
                phone: phone,
                bio: bio
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Failed to update profile');
        }

        // Success UI
        msgEl.textContent = 'Profile updated successfully!';
        msgEl.classList.add('success');

        // Update Sidebar instantly
        const displayName = fullName || 'User';
        document.getElementById('sidebar-name').textContent = displayName;
        document.getElementById('sidebar-avatar').textContent = displayName.substring(0, 2).toUpperCase();

        setTimeout(() => {
            msgEl.textContent = '';
            msgEl.className = 'profile-msg';
        }, 3000);

    } catch (error) {
        msgEl.textContent = error.message;
        msgEl.classList.add('error');
    } finally {
        // Reset UI
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}
function logout() {
    localStorage.removeItem('access_token');
    window.location.href = 'index.html';
}
