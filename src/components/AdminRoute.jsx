import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children }) => {
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (!isAdmin) {
        // Redirect to dashboard if not admin
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default AdminRoute;
