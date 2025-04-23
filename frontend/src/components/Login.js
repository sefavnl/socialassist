import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/login', {
                email,
                password
            });
            
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err.response?.data || err);
            setError(err.response?.data?.error || 'Giriş yapılırken bir hata oluştu');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Hoş Geldiniz</h2>
                    <p>Hedeflerinize ulaşmak için giriş yapın</p>
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">E-posta</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="E-posta adresinizi girin"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Şifre</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Şifrenizi girin"
                            required
                        />
                    </div>
                    
                    <button type="submit" className="auth-button">
                        Giriş Yap
                    </button>
                </form>
                
                <div className="auth-links">
                    <a href="/forgot-password">Şifremi Unuttum</a>
                    <a href="/register">Hesap Oluştur</a>
                </div>
            </div>
        </div>
    );
};

export default Login; 