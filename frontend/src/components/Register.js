import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Şifreler eşleşmiyor');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password
            });

            if (response.status === 201) {
                setSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Kayıt sırasında bir hata oluştu');
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <div className="register-header">
                    <h1>SocialAssist</h1>
                    <h2>Hesap Oluştur</h2>
                    <p>Hedeflerinize ulaşmak için hemen kayıt olun</p>
                </div>

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="name">Ad Soyad</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Adınız ve soyadınız"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">E-posta</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="E-posta adresiniz"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Şifre</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Şifreniz"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Şifre Tekrar</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Şifrenizi tekrar girin"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <button type="submit" className="register-button">
                        Kayıt Ol
                    </button>

                    <div className="register-footer">
                        <p>Zaten hesabınız var mı?</p>
                        <button 
                            type="button" 
                            className="login-link"
                            onClick={() => navigate('/login')}
                        >
                            Giriş Yap
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register; 