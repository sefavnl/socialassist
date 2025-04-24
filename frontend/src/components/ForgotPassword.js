import React, { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showResetForm, setShowResetForm] = useState(false);
    const navigate = useNavigate();

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/api/forgot-password', {
                email: email
            });

            if (response.status === 200) {
                setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi');
                setResetToken(response.data.reset_token);
                setShowResetForm(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Şifre sıfırlama işlemi sırasında bir hata oluştu');
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/api/reset-password', {
                token: resetToken,
                password: newPassword
            });

            if (response.data.message) {
                setSuccess('Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Şifre sıfırlanırken bir hata oluştu');
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <div className="forgot-password-header">
                    <h1>SocialAssist</h1>
                    <h2>Şifre Sıfırlama</h2>
                    <p>Hesabınıza tekrar erişmek için şifrenizi sıfırlayın</p>
                </div>

                {!showResetForm ? (
                    <form onSubmit={handleForgotPassword} className="forgot-password-form">
                        <div className="form-group">
                            <label htmlFor="email">E-posta</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="E-posta adresiniz"
                                required
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <button type="submit" className="reset-button">
                            Şifre Sıfırlama Bağlantısı Gönder
                        </button>

                        <div className="forgot-password-footer">
                            <p>Hesabınızı hatırladınız mı?</p>
                            <button 
                                type="button" 
                                className="login-link"
                                onClick={() => navigate('/login')}
                            >
                                Giriş Yap
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="forgot-password-form">
                        <div className="form-group">
                            <label htmlFor="newPassword">Yeni Şifre</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Yeni şifreniz"
                                required
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <button type="submit" className="reset-button">
                            Şifreyi Güncelle
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword; 