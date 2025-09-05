import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

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
        <div className="max-w-md mx-auto mt-10 p-4">
            <h1 className="text-2xl font-bold mb-4">Registrazione</h1>
            {error && <p className="text-red-500">{error}</p>}
            <form onSubmit={handleRegister} className="flex flex-col gap-2">
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
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Registrati
                </button>
            </form>
            <p className="mt-4">
                Hai già un account?{' '}
                <a href="/login" className="text-blue-500">
                    Accedi
                </a>
            </p>
        </div>
    );
}