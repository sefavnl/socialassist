import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import Chatbot from './Chatbot';
import './Dashboard.css';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [goals, setGoals] = useState([]);
    const [newGoal, setNewGoal] = useState({ title: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userData = JSON.parse(localStorage.getItem('user'));
                setUser(userData);

                const response = await api.get('/api/goals');
                setGoals(response.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Veriler yüklenirken bir hata oluştu');
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleAddGoal = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/goals', newGoal);

            if (response.data.message === 'Goal added successfully') {
                // Yeni hedefi ekle ve state'i güncelle
                const newGoalWithId = {
                    ...newGoal,
                    _id: response.data.goalId,
                    createdAt: new Date().toISOString(),
                    completed: false
                };
                setGoals([...goals, newGoalWithId]);
                setNewGoal({ title: '', description: '' });
            }
        } catch (err) {
            console.error('Error adding goal:', err);
            setError('Hedef eklenirken bir hata oluştu');
        }
    };

    const handleCompleteGoal = async (goalId) => {
        if (!goalId) {
            setError('Hedef ID\'si bulunamadı');
            return;
        }

        try {
            const response = await api.put(`/api/goals/${goalId}`, {
                completed: true
            });
            
            if (response.data.message === 'Goal updated successfully') {
                setGoals(goals.map(goal => 
                    goal._id === goalId ? { ...goal, completed: true } : goal
                ));
            }
        } catch (err) {
            console.error('Error completing goal:', err);
            setError('Hedef tamamlanırken bir hata oluştu');
        }
    };

    const handleDeleteGoal = async (goalId) => {
        if (!goalId) {
            setError('Hedef ID\'si bulunamadı');
            return;
        }

        try {
            const response = await api.delete(`/api/goals/${goalId}`);
            
            if (response.data.message === 'Goal deleted successfully') {
                setGoals(goals.filter(goal => goal._id !== goalId));
            }
        } catch (err) {
            console.error('Error deleting goal:', err);
            setError('Hedef silinirken bir hata oluştu');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div className="app-title">
                    <h1>SocialAssist</h1>
                    <p>Hedeflerinize ulaşmanıza yardımcı olan kişisel asistanınız</p>
                </div>
                <div className="header-right">
                    <div className="user-info">
                        <h2>Hoş Geldin, {user?.name}</h2>
                        <p>Hedeflerine ulaşmak için çalışmaya devam et!</p>
                    </div>
                    <button onClick={handleLogout} className="logout-button">
                        Çıkış Yap
                    </button>
                </div>
            </div>

            <div className="stats-container">
                <div className="stat-card">
                    <h3>Toplam Hedef</h3>
                    <p>{goals.length}</p>
                </div>
                <div className="stat-card">
                    <h3>Tamamlanan</h3>
                    <p>{goals.filter(g => g.completed).length}</p>
                </div>
                <div className="stat-card">
                    <h3>Devam Eden</h3>
                    <p>{goals.filter(g => !g.completed).length}</p>
                </div>
            </div>

            <main className="dashboard-main">
                <section className="add-goal-section">
                    <h2>Yeni Hedef Ekle</h2>
                    <form onSubmit={handleAddGoal} className="goal-form">
                        <div className="form-group">
                            <input
                                type="text"
                                value={newGoal.title}
                                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                                placeholder="Hedef başlığı"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <textarea
                                value={newGoal.description}
                                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                                placeholder="Hedef açıklaması"
                                required
                            />
                        </div>
                        <button type="submit" className="add-goal-button">
                            Hedef Ekle
                        </button>
                    </form>
                </section>

                <section className="goals-section">
                    <h2>Hedeflerim</h2>
                    {error && <div className="error-message">{error}</div>}
                    <div className="goals-grid">
                        {goals.map(goal => (
                            <div key={goal._id} className={`goal-card ${goal.completed ? 'completed' : ''}`}>
                                <div className="goal-content">
                                    <h3>{goal.title}</h3>
                                    <p>{goal.description}</p>
                                    <div className="goal-meta">
                                        <span className="goal-date">
                                            {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString('tr-TR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            }) : new Date().toLocaleDateString('tr-TR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <span className={`goal-status ${goal.completed ? 'completed' : 'pending'}`}>
                                            {goal.completed ? 'Tamamlandı' : 'Devam Ediyor'}
                                        </span>
                                    </div>
                                </div>
                                <div className="goal-actions">
                                    {!goal.completed && (
                                        <button
                                            onClick={() => goal._id && handleCompleteGoal(goal._id)}
                                            className="complete-button"
                                        >
                                            Tamamla
                                        </button>
                                    )}
                                    <button
                                        onClick={() => goal._id && handleDeleteGoal(goal._id)}
                                        className="delete-button"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            
            <Chatbot />
        </div>
    );
};

export default Dashboard; 