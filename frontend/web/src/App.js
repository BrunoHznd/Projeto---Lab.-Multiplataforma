/**
 * tiResolve Web - Componente App Principal
 * Gerencia rotas e layout com sidebar.
 * Controle de acesso por role: ADMIN, TECNICO, USUARIO.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser, getOrg, logout, API_URL, listarNotificacoes } from './services/api';
import { WebSocketProvider, useWebSocketEvent } from './contexts/WebSocketContext';

// Paginas
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import ChamadosPage from './pages/Chamados';
import UsuariosPage from './pages/Usuarios';
import MaquinasPage from './pages/Maquinas';
import InventarioPage from './pages/Inventario';
import NotificacoesPage from './pages/Notificacoes';

/**
 * Componente de rota protegida.
 */
function PrivateRoute({ children, allowedRoles }) {
    const user = getUser();
    if (!isAuthenticated()) return <Navigate to="/login" />;
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" />;
    }
    return children;
}

/**
 * Retorna os links da sidebar conforme o role do usuario.
 */
function getLinksForRole(role) {
    const allLinks = [
        { to: '/dashboard', icon: '📊', label: 'Dashboard', roles: ['ADMIN', 'TECNICO'] },
        { to: '/chamados', icon: '📋', label: 'Chamados', roles: ['ADMIN', 'TECNICO', 'USUARIO'] },
        { to: '/notificacoes', icon: '🔔', label: 'Notificações', roles: ['ADMIN', 'TECNICO', 'USUARIO'] },
        { to: '/usuarios', icon: '👥', label: 'Usuarios', roles: ['ADMIN'] },
        { to: '/maquinas', icon: '🖥️', label: 'Maquinas', roles: ['ADMIN', 'TECNICO'] },
        { to: '/inventario', icon: '📦', label: 'Inventario', roles: ['ADMIN', 'TECNICO'] },
    ];
    return allLinks.filter(link => link.roles.includes(role));
}

/**
 * Retorna o label do role em portugues.
 */
function getRoleLabel(role) {
    const labels = {
        'ADMIN': 'Administrador',
        'TECNICO': 'Tecnico',
        'USUARIO': 'Usuario',
    };
    return labels[role] || role || 'N/A';
}

/**
 * Retorna a rota padrao conforme o role.
 */
function getDefaultRoute(role) {
    if (role === 'USUARIO') return '/chamados';
    return '/dashboard';
}

/**
 * Layout principal com sidebar.
 */
function Layout({ children }) {
    const navigate = useNavigate();
    const user = getUser();
    const org = getOrg();
    const links = getLinksForRole(user?.role);

    const [unreadCount, setUnreadCount] = React.useState(0);

    React.useEffect(() => {
        if (!user) return;
        listarNotificacoes().then(data => setUnreadCount(data.length)).catch(() => {});
    }, []);

    // Escuta eventos WebSocket via context centralizado
    useWebSocketEvent('NOTIFICACAO', () => {
        setUnreadCount(prev => prev + 1);
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    {org?.logo_url ? (
                        <img
                            src={`${API_URL}${org.logo_url}`}
                            alt="Logo"
                            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
                        />
                    ) : (
                        <span className="sidebar-logo-icon">🖥️</span>
                    )}
                    <h2>tiResolve<span>{org?.nome || 'Centro de Informatica'}</span>{org?.codigo_acesso && <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.5 }}>ID: {org.codigo_acesso}</span>}</h2>
                </div>

                <nav className="sidebar-nav">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            onClick={() => {
                                if (link.to === '/notificacoes') setUnreadCount(0); // Optional optimistic zeroing
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
                    <div className="sidebar-avatar">
                        {user?.nome?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.nome || 'Usuario'}</div>
                        <div className="sidebar-user-role">{getRoleLabel(user?.role)}</div>
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout} title="Sair" style={{ marginLeft: 'auto' }}>
                        🚪
                    </button>
                </div>
            </aside>

            {/* Conteudo principal */}
            <main className="main-content">
                {children}
            </main>
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

/**
 * App principal com roteamento baseado em roles.
 */
export default function App() {
    const user = getUser();
    const defaultRoute = getDefaultRoute(user?.role);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Dashboard - Admin e Tecnico */}
                <Route path="/dashboard" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO']}>
                        <LayoutWithProvider><DashboardPage /></LayoutWithProvider>
                    </PrivateRoute>
                } />

                {/* Chamados - Todos */}
                <Route path="/chamados" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO', 'USUARIO']}>
                        <LayoutWithProvider><ChamadosPage /></LayoutWithProvider>
                    </PrivateRoute>
                } />

                {/* Notificacoes - Todos */}
                <Route path="/notificacoes" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO', 'USUARIO']}>
                        <LayoutWithProvider><NotificacoesPage /></LayoutWithProvider>
                    </PrivateRoute>
                } />

                {/* Usuarios - Apenas Admin */}
                <Route path="/usuarios" element={
                    <PrivateRoute allowedRoles={['ADMIN']}>
                        <LayoutWithProvider><UsuariosPage /></LayoutWithProvider>
                    </PrivateRoute>
                } />

                {/* Maquinas - Admin e Tecnico */}
                <Route path="/maquinas" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO']}>
                        <LayoutWithProvider><MaquinasPage /></LayoutWithProvider>
                    </PrivateRoute>
                } />

                {/* Inventario - Admin e Tecnico */}
                <Route path="/inventario" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO']}>
                        <LayoutWithProvider><InventarioPage /></LayoutWithProvider>
                    </PrivateRoute>
                } />

                <Route path="*" element={<Navigate to={defaultRoute} />} />
            </Routes>
        </BrowserRouter>
    );
}
