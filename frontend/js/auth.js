(function () {
  async function postJSON(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body.errors && body.errors.join(' ')) || body.error || 'Something went wrong.');
    }
    return body;
  }

  function redirectByRole(role) {
    window.location.href = (role === 'admin' || role === 'superadmin') ? '/admin' : '/dashboard';
  }

  function showError(form, message) {
    let box = form.querySelector('.auth-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'alert alert-danger auth-error mt-3';
      form.appendChild(box);
    }
    box.textContent = message;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.classList.add('btn-loading');
        try {
          const { user } = await postJSON('/api/auth/login', {
            email: loginForm.email.value.trim(),
            password: loginForm.password.value,
          });
          redirectByRole(user.role);
        } catch (err) {
          showError(loginForm, err.message);
        } finally {
          btn.classList.remove('btn-loading');
        }
      });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registerForm.querySelector('button[type="submit"]');
        btn.classList.add('btn-loading');
        try {
          const { user } = await postJSON('/api/auth/register', {
            name: registerForm.name.value.trim(),
            email: registerForm.email.value.trim(),
            password: registerForm.password.value,
          });
          redirectByRole(user.role);
        } catch (err) {
          showError(registerForm, err.message);
        } finally {
          btn.classList.remove('btn-loading');
        }
      });
    }
  });
})();