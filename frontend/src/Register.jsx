import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
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
        } catch (err) {
            setError('Errore durante la registrazione. Email già in uso?');
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
                    <div className="form-actions" style={{ marginTop: 8 }}>
                        <button type="submit" className="btn">Registrati</button>
                        <a href="/login" className="link" style={{ alignSelf: 'center' }}>Accedi</a>
                    </div>
                </form>
            </div>
        </div>
    );
}