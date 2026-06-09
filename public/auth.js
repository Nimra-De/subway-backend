// auth.js — handles signup and login form submissions

document.addEventListener('DOMContentLoaded', () => {

    // ── SIGNUP FORM ──────────────────────────────────────────
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear errors
            ['firstName','lastName','age','password','confirmPassword'].forEach(f => {
                const el = document.getElementById(f + 'Error');
                if (el) el.textContent = '';
            });
            const formMsg = document.getElementById('formMessage');
            if (formMsg) formMsg.textContent = '';

            const firstName       = document.getElementById('firstName').value.trim();
            const lastName        = document.getElementById('lastName').value.trim();
            const age             = document.getElementById('age').value;
            const email           = document.getElementById('email').value.trim();
            const password        = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validation
            let valid = true;
            if (!firstName || firstName.length < 2) {
                document.getElementById('firstNameError').textContent = 'First name must be at least 2 characters.';
                valid = false;
            }
            if (!lastName || lastName.length < 2) {
                document.getElementById('lastNameError').textContent = 'Last name must be at least 2 characters.';
                valid = false;
            }
            if (!age || age < 5 || age > 100) {
                document.getElementById('ageError').textContent = 'Please enter a valid age.';
                valid = false;
            }
            if (!password || password.length < 6) {
                document.getElementById('passwordError').textContent = 'Password must be at least 6 characters.';
                valid = false;
            }
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match.';
                valid = false;
            }
            if (!valid) return;

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            try {
                const data = await API.signup({ firstName, lastName, age: Number(age), email, password });

                // Save token and user
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (formMsg) {
                    formMsg.style.color = '#00e676';
                    formMsg.textContent = '✅ Account created! Redirecting...';
                }
                setTimeout(() => window.location.href = 'index.html', 1200);

            } catch (err) {
                if (formMsg) {
                    formMsg.style.color = '#ef4444';
                    formMsg.textContent = '❌ ' + (err.message || 'Signup failed. Try again.');
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register';
            }
        });

        // Password strength bar
        const passwordInput = document.getElementById('password');
        const strengthFill  = document.getElementById('strengthFill');
        if (passwordInput && strengthFill) {
            passwordInput.addEventListener('input', () => {
                const val = passwordInput.value;
                let strength = 0;
                if (val.length >= 6)  strength++;
                if (val.length >= 10) strength++;
                if (/[A-Z]/.test(val)) strength++;
                if (/[0-9]/.test(val)) strength++;
                if (/[^A-Za-z0-9]/.test(val)) strength++;

                const colors = ['#ef4444','#f59e0b','#f59e0b','#10b981','#00f5ff'];
                strengthFill.style.width  = (strength * 20) + '%';
                strengthFill.style.background = colors[strength - 1] || '#ef4444';
            });
        }

        // Email availability check
        const emailInput = document.getElementById('email');
        const emailMsg   = document.getElementById('emailMessage');
        if (emailInput && emailMsg) {
            emailInput.addEventListener('blur', () => {
                const val = emailInput.value.trim();
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(val)) {
                    emailMsg.style.color = '#ef4444';
                    emailMsg.textContent = '⚠️ Invalid email format.';
                } else {
                    emailMsg.style.color = '#00e676';
                    emailMsg.textContent = '✅ Email looks good!';
                }
            });
        }
    }

    // ── LOGIN FORM ───────────────────────────────────────────
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email    = document.getElementById('loginEmail')?.value.trim()
                          || document.getElementById('email')?.value.trim();
            const password = document.getElementById('loginPassword')?.value
                          || document.getElementById('password')?.value;
            const formMsg  = document.getElementById('loginMessage') || document.getElementById('formMessage');

            if (!email || !password) {
                if (formMsg) { formMsg.style.color = '#ef4444'; formMsg.textContent = '❌ Please enter email and password.'; }
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            try {
                const data = await API.login({ email, password });

                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                if (formMsg) { formMsg.style.color = '#00e676'; formMsg.textContent = '✅ Login successful! Redirecting...'; }

                // Redirect admin to admin panel, others to home
                setTimeout(() => {
                    window.location.href = data.user.role === 'admin' ? 'admin.html' : 'index.html';
                }, 1000);

            } catch (err) {
                if (formMsg) { formMsg.style.color = '#ef4444'; formMsg.textContent = '❌ ' + (err.message || 'Login failed.'); }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    }

});