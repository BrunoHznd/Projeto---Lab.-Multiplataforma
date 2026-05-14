/**
 * tiResolve Desktop - App Principal
 * Aplicação desktop para técnicos do Centro de Informática.
 */

import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { isAuthenticated, getUser, logout } from './services/api';

import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import KanbanBoard from './pages/KanbanBoard';
import MaquinasMonitor from './pages/MaquinasMonitor';

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
        { to: '/dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
        { to: '/kanban', icon: 'fa-columns', label: 'Kanban' },
        { to: '/maquinas', icon: 'fa-desktop', label: 'Monitoramento' },
    ];

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span className="sidebar-logo-icon"><i className="fa-solid fa-wrench"></i></span>
                    <h2>tiResolve<span>Painel Técnico</span></h2>
                </div>

                <nav className="sidebar-nav">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="sidebar-link-icon"><i className={`fa-solid ${link.icon}`}></i></span>
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">{user?.nome?.charAt(0)?.toUpperCase() || '?'}</div>
                    <div style={{ flex: 1 }}>
                        <div className="sidebar-user-name">{user?.nome || 'Técnico'}</div>
                        <div className="sidebar-user-role">{user?.role || 'TECNICO'}</div>
                    </div>
                    <button className="sidebar-logout" onClick={handleLogout} title="Sair"><i className="fa-solid fa-right-from-bracket"></i></button>
                </div>
            </aside>

            <main className="main-content">{children}</main>
        </div>
    );
}

export default function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
                <Route path="/kanban" element={<PrivateRoute><Layout><KanbanBoard /></Layout></PrivateRoute>} />
                <Route path="/maquinas" element={<PrivateRoute><Layout><MaquinasMonitor /></Layout></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </HashRouter>
    );
}
