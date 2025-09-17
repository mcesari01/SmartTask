import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const res = await axios.post('http://localhost:8000/login', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Login successful:', res.data);
            localStorage.setItem('token', res.data.access_token);
            navigate('/');
        } catch (err) {
            console.error('Login error:', err.response?.data || err.message);
            setError(
                err.response?.status === 401
                    ? 'Email o password errati'
                    : 'Errore durante il login. Riprova.'
            );
        }
    };

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
                <div className="section-title">Accedi</div>
                {error && <p style={{ color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p>}
                <form onSubmit={handleLogin} className="form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <input id="email" type="email" placeholder="email@esempio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="field">
                        <label htmlFor="password">Password</label>
                        <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="form-actions" style={{ marginTop: 8 }}>
                        <button type="submit" className="btn" disabled={!email || !password}>Accedi</button>
                        <a href="/register" className="link" style={{ alignSelf: 'center' }}>Registrati</a>
                    </div>
                </form>
            </div>
        </div>
    );
}