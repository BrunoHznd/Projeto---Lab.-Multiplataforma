/**
 * tiResolve Web - Componente App Principal
 * Gerencia rotas e layout com sidebar.
 * Controle de acesso por role: ADMIN, TECNICO, USUARIO.
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser, getOrg, logout, API_URL } from './services/api';

// Paginas
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import ChamadosPage from './pages/Chamados';
import UsuariosPage from './pages/Usuarios';
import MaquinasPage from './pages/Maquinas';
import InventarioPage from './pages/Inventario';

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
        { to: '/dashboard', icon: 'fa-chart-bar', label: 'Dashboard', roles: ['ADMIN', 'TECNICO'] },
        { to: '/chamados', icon: 'fa-ticket', label: 'Chamados', roles: ['ADMIN', 'TECNICO', 'USUARIO'] },
        { to: '/usuarios', icon: 'fa-users', label: 'Usuarios', roles: ['ADMIN'] },
        { to: '/maquinas', icon: 'fa-network-wired', label: 'Infraestrutura', roles: ['ADMIN', 'TECNICO'] },
        { to: '/inventario', icon: 'fa-box', label: 'Inventario', roles: ['ADMIN', 'TECNICO'] },
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
    const [menuAberta, setMenuAberta] = useState(false);

    // Ajuste para arrastar e abrir a sidebar
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const handleTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        
        if (isLeftSwipe && menuAberta) {
            setMenuAberta(false);
        }
        if (isRightSwipe && !menuAberta && touchStart < 40) { // Abre apenas se puxar da beirada esquerda
            setMenuAberta(true);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-layout" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            {/* Header Mobile Oculto no PC */}
            <div className="mobile-header">
                <button className="mobile-menu-btn" onClick={() => setMenuAberta(true)}><i className="fa-solid fa-bars"></i></button>
                <div style={{ marginLeft: 12, fontWeight: 700, color: 'var(--cor-primaria)', fontSize: 18 }}>tiResolve</div>
            </div>

            {/* Overlay para fechar ao clicar */}
            {menuAberta && <div className="sidebar-overlay" onClick={() => setMenuAberta(false)}></div>}

            {/* Sidebar */}
            <aside className={`sidebar ${menuAberta ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    {org?.logo_url ? (
                        <img
                            src={`${API_URL}${org.logo_url}`}
                            alt="Logo"
                            style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
                        />
                    ) : (
                        <span className="sidebar-logo-icon"><i className="fa-solid fa-desktop"></i></span>
                    )}
                    <h2>tiResolve<span>{org?.nome || 'Centro de Informatica'}</span>{org?.codigo_acesso && <span style={{ fontSize: 10, letterSpacing: 2, opacity: 0.5 }}>ID: {org.codigo_acesso}</span>}</h2>
                </div>

                <nav className="sidebar-nav">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            onClick={() => setMenuAberta(false)}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="sidebar-link-icon"><i className={`fa-solid ${link.icon}`}></i></span>
                            {link.label}
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
                    <button className="sidebar-logout" onClick={handleLogout} title="Sair">
                        <i className="fa-solid fa-right-from-bracket"></i>
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
                        <Layout><DashboardPage /></Layout>
                    </PrivateRoute>
                } />

                {/* Chamados - Todos */}
                <Route path="/chamados" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO', 'USUARIO']}>
                        <Layout><ChamadosPage /></Layout>
                    </PrivateRoute>
                } />

                {/* Usuarios - Apenas Admin */}
                <Route path="/usuarios" element={
                    <PrivateRoute allowedRoles={['ADMIN']}>
                        <Layout><UsuariosPage /></Layout>
                    </PrivateRoute>
                } />

                {/* Maquinas - Admin e Tecnico */}
                <Route path="/maquinas" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO']}>
                        <Layout><MaquinasPage /></Layout>
                    </PrivateRoute>
                } />

                {/* Inventario - Admin e Tecnico */}
                <Route path="/inventario" element={
                    <PrivateRoute allowedRoles={['ADMIN', 'TECNICO']}>
                        <Layout><InventarioPage /></Layout>
                    </PrivateRoute>
                } />

                <Route path="*" element={<Navigate to={defaultRoute} />} />
            </Routes>
        </BrowserRouter>
    );
}
