/**
 * tiResolve Desktop - App Principal
 * Aplicação desktop para técnicos do Centro de Informática.
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser, logout, listarNotificacoes } from './services/api';
import { WebSocketProvider, useWebSocketEvent } from './contexts/WebSocketContext';

import LoginPage from './pages/Login';
import KanbanBoard from './pages/KanbanBoard';
import MaquinasMonitor from './pages/MaquinasMonitor';
import NotificacoesPage from './pages/Notificacoes';

function PrivateRoute({ children }) {
    return isAuthenticated() ? children : <Navigate to="/login" />;
}

function Layout({ children }) {
    const navigate = useNavigate();
    const user = getUser();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const links = [
        { to: '/kanban', icon: '📋', label: 'Kanban' },
        { to: '/maquinas', icon: '🖥️', label: 'Monitoramento' },
        { to: '/notificacoes', icon: '🔔', label: 'Notificações' },
    ];

    const [unreadCount, setUnreadCount] = React.useState(0);

    useEffect(() => {
        if (!user) return;
        listarNotificacoes().then(data => setUnreadCount(data.length)).catch(() => {});
    }, []);

    // Escuta eventos WebSocket via context centralizado
    useWebSocketEvent('NOTIFICACAO', (data) => {
        setUnreadCount(prev => prev + 1);
        // Notificacao nativa do Electron
        if (window?.electronAPI?.notifyTicketCreated) {
            window.electronAPI.notifyTicketCreated({
                titulo: data.titulo,
                solicitante: data.mensagem
            });
        }
    });

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span className="sidebar-logo-icon">🔧</span>
                    <h2>tiResolve<span>Painel Técnico</span></h2>
                </div>

                <nav className="sidebar-nav">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                if (link.to === '/notificacoes') setUnreadCount(0);
                            }}
                        >
                            <span className="sidebar-link-icon">{link.icon}</span>
                            {link.label}
                            {link.to === '/notificacoes' && unreadCount > 0 && (
                                <span style={{ marginLeft: 'auto', background: '#FF6B6B', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '10px' }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">{user?.nome?.charAt(0)?.toUpperCase() || '?'}</div>
                    <div style={{ flex: 1 }}>
                        <div className="sidebar-user-name">{user?.nome || 'Técnico'}</div>
                        <div className="sidebar-user-role">{user?.role || 'TECNICO'}</div>
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout} title="Sair" style={{ marginLeft: 'auto' }}>🚪</button>
                </div>
            </aside>

            <main className="main-content">{children}</main>
        </div>
    );
}

function LayoutWithProvider({ children }) {
    const user = getUser();
    return (
        <WebSocketProvider user={user}>
            <Layout>{children}</Layout>
        </WebSocketProvider>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/kanban" element={<PrivateRoute><LayoutWithProvider><KanbanBoard /></LayoutWithProvider></PrivateRoute>} />
                <Route path="/maquinas" element={<PrivateRoute><LayoutWithProvider><MaquinasMonitor /></LayoutWithProvider></PrivateRoute>} />
                <Route path="/notificacoes" element={<PrivateRoute><LayoutWithProvider><NotificacoesPage /></LayoutWithProvider></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/kanban" />} />
            </Routes>
        </BrowserRouter>
    );
}
