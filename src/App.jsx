import React from 'react';
import './index.css';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { BrokerProvider } from './context/BrokerContext';
import { UserProvider } from './context/UserContext';
import { SocketProvider } from './context/SocketContext';
import Sidebar from './components/Sidebar';
import Trading from './components/Trading';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Admin from './components/Admin';
import AdminRoute from './components/AdminRoute';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const broker = localStorage.getItem('currentBroker');
  if (!broker) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  const isLoginPage = window.location.pathname === '/login';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  return (
    <SocketProvider>
      <Router>
        <UserProvider>
          <BrokerProvider>
            <div className="min-h-screen bg-gray-50">
              {!isLoginPage && <Sidebar />}
              <div className={`${!isLoginPage ? 'ml-64' : ''} min-h-screen bg-white`}>
                <div className="container mx-auto px-4 py-6">
                  <nav className="bg-white shadow-lg">
                    <div className="max-w-7xl mx-auto px-4">
                      <div className="flex justify-between h-16">
                        <div className="flex">
                          <Link to="/trading" className="flex items-center px-4 py-2 text-gray-700 hover:text-gray-900">
                            Trading
                          </Link>
                          {isAdmin && (
                            <Link to="/admin" className="flex items-center px-4 py-2 text-gray-700 hover:text-gray-900">
                              Admin
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </nav>

                  <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/report" element={
                        <ProtectedRoute>
                          <Report />
                        </ProtectedRoute>
                      } />
                      <Route path="/trading" element={
                        <ProtectedRoute>
                          <Trading />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin" element={
                        <ProtectedRoute>
                          <AdminRoute>
                            <Admin />
                          </AdminRoute>
                        </ProtectedRoute>
                      } />
                      <Route path="/" element={<Navigate to="/login" />} />
                    </Routes>
                  </div>
                </div>
              </div>
            </div>
          </BrokerProvider>
        </UserProvider>
      </Router>
    </SocketProvider>
  );
}

export default App;
