import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const googleDivRef = useRef(null);
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/register', {
                email,
                password,
            });
            navigate('/login');
        } catch {
            setError('Errore durante la registrazione. Email già in uso?');
        }
    };

    // Google Sign-In
    useEffect(() => {
        const clientId = '39094537919-fpqfsor5dc2mrgbacotk4tlt1mc8j19u.apps.googleusercontent.com';

        function handleCredentialResponse(response) {
            const { credential } = response || {};
            if (!credential) return;
            axios.post('http://localhost:8000/auth/google', { credential })
                .then((res) => {
                    localStorage.setItem('token', res.data.access_token);
                    navigate('/');
                })
                .catch(() => {
                    // Do not override register error state here
                });
        }

        const scriptId = 'google-identity-services';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.id = scriptId;
            script.onload = () => {
                 
                window.google?.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleCredentialResponse,
                    ux_mode: 'popup',
                });
                if (googleDivRef.current) {
                     
                    window.google?.accounts.id.renderButton(googleDivRef.current, {
                        theme: theme === 'light' ? 'outline' : 'filled_black',
                        size: 'large',
                        shape: 'pill',
                        text: 'signup_with',
                        width: 320,
                    });
                }
            };
            document.body.appendChild(script);
        } else {
             
            window.google?.accounts.id.initialize({
                client_id: clientId,
                callback: handleCredentialResponse,
                ux_mode: 'popup',
            });
            if (googleDivRef.current) {
                 
                window.google?.accounts.id.renderButton(googleDivRef.current, {
                    theme: theme === 'light' ? 'outline' : 'filled_black',
                    size: 'large',
                    shape: 'pill',
                    text: 'signup_with',
                    width: 320,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    return (
        <div className="page-container centered-page">
            <div className="topbar" style={{ marginTop: 0, marginBottom: 24 }}>
                <div className="app-title">SmartTask</div>
                <div className="topbar-actions">
                    <button className="btn btn-ghost" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle dark mode">
                    {theme === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
                    </button>
                </div>
            </div>
            <div className="card auth-card">
                <div className="section-title">Registrati</div>
                {error && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p>}
                <form onSubmit={handleRegister} className="form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" placeholder="email@esempio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="form-actions" style={{ marginTop: 8, justifyContent: 'space-between' }}>
                        <button type="submit" className="btn">Registrati</button>
                        <a href="/login" className="link" style={{ alignSelf: 'center' }}>Accedi</a>
                    </div>
                </form>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                    <div style={{ height: 1, background: 'var(--color-border)', flex: 1 }} />
                    <span className="muted" style={{ fontSize: 12 }}>oppure</span>
                    <div style={{ height: 1, background: 'var(--color-border)', flex: 1 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                    <div ref={googleDivRef} />
                </div>
            </div>
        </div>
    );
}