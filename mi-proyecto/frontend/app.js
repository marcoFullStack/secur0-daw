const API_URL = 'http://localhost:3000/api';

// Utilities for Token Management
function getToken() {
    return localStorage.getItem('forum_token');
}

function getUsername() {
    return localStorage.getItem('forum_username');
}

function setAuth(token, username) {
    localStorage.setItem('forum_token', token);
    localStorage.setItem('forum_username', username);
}

function clearAuth() {
    localStorage.removeItem('forum_token');
    localStorage.removeItem('forum_username');
}

// Check Authentication Status and Update UI
function updateAuthUI() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return; // Not on a page with nav

    const token = getToken();
    const username = getUsername();

    if (token) {
        navAuth.innerHTML = `
            <li>Hola, <strong>${username}</strong></li>
            <li><a href="#" id="logout-btn" class="secondary">Salir</a></li>
        `;
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            clearAuth();
            window.location.reload();
        });

        // If on main page, show post section
        const postSection = document.getElementById('post-section');
        if (postSection) postSection.style.display = 'block';
    } else {
        navAuth.innerHTML = `
            <li><a href="login.html" class="secondary">Entrar</a></li>
            <li><a href="register.html" class="contrast">Registro</a></li>
        `;
        // If on main page, hide post section
        const postSection = document.getElementById('post-section');
        if (postSection) postSection.style.display = 'none';
    }
}

// Fetch and Display Messages
async function loadMessages() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/messages`);
        if (!response.ok) throw new Error('Error al cargar mensajes');
        
        const messages = await response.json();
        const currentUsername = getUsername();

        container.innerHTML = ''; // Clear loading state
        container.setAttribute('aria-busy', 'false');

        if (messages.length === 0) {
            container.innerHTML = '<p>No hay mensajes aún. ¡Sé el primero en publicar!</p>';
            return;
        }

        messages.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleString('es-ES');
            const isOwner = currentUsername === msg.autor;
            
            const article = document.createElement('article');
            article.className = 'message-card';
            
            let html = `
                <div class="message-header">
                    <strong>@${encodeHTML(msg.autor)}</strong>
                    <small>${date}</small>
                </div>
                <div class="message-content">${encodeHTML(msg.texto)}</div>
            `;

            // Add delete button if user is the author
            if (isOwner) {
                html += `<footer>
                            <button class="delete-btn" onclick="deleteMessage(${msg.id})">Borrar</button>
                         </footer>`;
            }

            article.innerHTML = html;
            container.appendChild(article);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="error-message">No se pudieron cargar los mensajes. Asegúrate de que el backend esté en ejecución.</p>';
        container.setAttribute('aria-busy', 'false');
    }
}

// Post a Message
async function initializePostForm() {
    const form = document.getElementById('post-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('message-input');
        const errorDiv = document.getElementById('post-error');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const texto = input.value.trim();
        if (!texto) return;

        submitBtn.setAttribute('aria-busy', 'true');
        errorDiv.textContent = '';

        try {
            const response = await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ texto })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al publicar');
            }

            // Success
            input.value = '';
            loadMessages(); // Reload the board
        } catch (error) {
            errorDiv.textContent = error.message;
        } finally {
            submitBtn.setAttribute('aria-busy', 'false');
        }
    });
}

// Delete Message
window.deleteMessage = async function(id) {
    if (!confirm('¿Seguro que quieres borrar este mensaje?')) return;

    try {
        const response = await fetch(`${API_URL}/messages/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al borrar');
        }

        loadMessages(); // Reload after delete
    } catch (error) {
        alert(error.message);
    }
};

// Initialize Registration Form
function initializeRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const messageDiv = document.getElementById('register-message');
        const btn = form.querySelector('button[type="submit"]');

        btn.setAttribute('aria-busy', 'true');
        messageDiv.className = 'alert-message';
        messageDiv.textContent = '';

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error en el registro');
            }

            messageDiv.classList.add('success-message');
            messageDiv.textContent = 'Registro exitoso. Redirigiendo al login...';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);

        } catch (error) {
            messageDiv.classList.add('error-message');
            messageDiv.textContent = error.message;
        } finally {
            btn.setAttribute('aria-busy', 'false');
        }
    });
}

// Initialize Login Form
function initializeLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        const errorDiv = document.getElementById('login-error');
        const btn = form.querySelector('button[type="submit"]');

        btn.setAttribute('aria-busy', 'true');
        errorDiv.textContent = '';

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Credenciales inválidas');
            }

            setAuth(result.token, result.username);
            window.location.href = '/'; // Redirigir al muro

        } catch (error) {
            errorDiv.textContent = error.message;
        } finally {
            btn.setAttribute('aria-busy', 'false');
        }
    });
}

// Utility to prevent XSS in rendering
function encodeHTML(str) {
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    loadMessages();
    initializePostForm();
    initializeRegisterForm();
    initializeLoginForm();
});
