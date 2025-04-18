import React, { useState, useEffect } from 'react';

const SessionControl = () => {
    const [activeSession, setActiveSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    // Only render if user is admin
    if (!isAdmin) {
        return null;
    }

    const fetchActiveSession = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/sessions/active');
            if (response.ok) {
                const data = await response.json();
                setActiveSession(data);
                setMessage('');
            } else if (response.status === 404) {
                setActiveSession(null);
                setMessage('No active session. Click "Start Session" to begin.');
            }
        } catch (error) {
            console.error('Error fetching active session:', error);
            setMessage('Unable to connect to server. Please ensure the server is running.');
        }
    };

    useEffect(() => {
        fetchActiveSession();
        // Fetch session status every 30 seconds
        const fetchInterval = setInterval(fetchActiveSession, 30000);
        return () => clearInterval(fetchInterval);
    }, []);

    const handleSessionAction = async (action) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:5000/api/sessions/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to perform action');
            }

            setMessage(getActionMessage(action, data));
            await fetchActiveSession();
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const getActionMessage = (action, data) => {
        switch (action) {
            case 'start':
                return `Started ${data.name}`;
            case 'end':
                return 'Session ended successfully';
            case 'next':
                return `Moved to ${data.name}`;
            case 'reset':
                return 'All sessions have been reset';
            default:
                return '';
        }
    };

    const getSessionStatus = () => {
        if (!activeSession) return message || 'No active session';
        return `${activeSession.name}`;
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Session Control</h2>
                <p className="text-gray-600">{getSessionStatus()}</p>
                {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>
            <div className="space-x-2">
                <button
                    onClick={() => handleSessionAction('start')}
                    disabled={loading || activeSession}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                    Start Session
                </button>
                <button
                    onClick={() => handleSessionAction('end')}
                    disabled={loading || !activeSession}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                >
                    End Session
                </button>
                
                <button
                    onClick={() => handleSessionAction('next')}
                    disabled={loading || !activeSession}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    Next Session
                </button>
                <button
                    onClick={() => handleSessionAction('reset')}
                    disabled={loading}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                >
                    Reset All
                </button>
            </div>
        </div>
    );
};

export default SessionControl;
