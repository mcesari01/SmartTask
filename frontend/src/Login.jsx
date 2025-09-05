import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

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
        <div className="max-w-md mx-auto mt-10 p-4">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            {error && <p className="text-red-500">{error}</p>}
            <form onSubmit={handleLogin} className="flex flex-col gap-2">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border p-2 rounded"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border p-2 rounded"
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    disabled={!email || !password}
                >
                    Accedi
                </button>
            </form>
            <p className="mt-4">
                Non hai un account?{' '}
                <a href="/register" className="text-blue-500">
                    Registrati
                </a>
            </p>
        </div>
    );
}