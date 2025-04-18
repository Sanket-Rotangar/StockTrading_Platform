import { API_BASE_URL } from '../config';

const API_ENDPOINT = `${API_BASE_URL}/api`;

// Broker operations
export const getAllBrokers = async () => {
    const response = await fetch(`${API_ENDPOINT}/brokers`);
    return response.json();
};

export const getBrokerById = async (id) => {
    const response = await fetch(`${API_ENDPOINT}/brokers/${id}`);
    return response.json();
};

export const createBroker = async (broker) => {
    const response = await fetch(`${API_ENDPOINT}/brokers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broker)
    });
    return response.json();
};

export const updateBroker = async (id, broker) => {
    const response = await fetch(`${API_ENDPOINT}/brokers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broker)
    });
    return response.json();
};

export const deleteBroker = async (id) => {
    const response = await fetch(`${API_ENDPOINT}/brokers/${id}`, {
        method: 'DELETE'
    });
    return response.json();
};

// Session operations
export const getAllSessions = async () => {
    try {
        const response = await fetch(`${API_ENDPOINT}/sessions`);
        if (!response.ok) throw new Error('Failed to fetch sessions');
        return await response.json();
    } catch (error) {
        console.error('Error fetching sessions:', error);
        throw error;
    }
};

export const getActiveSession = async () => {
    const response = await fetch(`${API_ENDPOINT}/sessions/active`);
    return response.json();
};

export const createSession = async (session) => {
    const response = await fetch(`${API_ENDPOINT}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
    });
    return response.json();
};

export const updateSession = async (id, session) => {
    try {
        const response = await fetch(`${API_ENDPOINT}/sessions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(session)
        });
        if (!response.ok) throw new Error('Failed to update session');
        return await response.json();
    } catch (error) {
        console.error('Error updating session:', error);
        throw error;
    }
};

export const deleteSession = async (id) => {
    const response = await fetch(`${API_ENDPOINT}/sessions/${id}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete session');
    }
    
    return response.json();
};

// Stock operations
export const getAllStocks = async () => {
    const response = await fetch(`${API_ENDPOINT}/stocks`);
    return response.json();
};

export const getStockById = async (id) => {
    const response = await fetch(`${API_ENDPOINT}/stocks/${id}`);
    return response.json();
};

export const createStock = async (stock) => {
    const response = await fetch(`${API_ENDPOINT}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stock)
    });
    return response.json();
};

export const updateStock = async (id, stock) => {
    const response = await fetch(`${API_ENDPOINT}/stocks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stock)
    });
    return response.json();
};

export const deleteStock = async (id) => {
    const response = await fetch(`${API_ENDPOINT}/stocks/${id}`, {
        method: 'DELETE'
    });
    return response.json();
};

// User operations
export const getAllUsers = async () => {
    const response = await fetch(`${API_ENDPOINT}/users`);
    return response.json();
};

export const getUserById = async (id) => {
    const response = await fetch(`${API_ENDPOINT}/users/${id}`);
    return response.json();
};

export const createUser = async (user) => {
    const response = await fetch(`${API_ENDPOINT}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    return response.json();
};

export const updateUser = async (id, user) => {
    const response = await fetch(`${API_ENDPOINT}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    return response.json();
};

export const deleteUser = async (id) => {
    const response = await fetch(`${API_ENDPOINT}/users/${id}`, {
        method: 'DELETE'
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
    }
    
    return response.json();
};

// Trade operations
export const getAllTrades = async () => {
    const response = await fetch(`${API_ENDPOINT}/trades`);
    return response.json();
};

export const createTrade = async (tradeData) => {
    const response = await fetch(`${API_ENDPOINT}/trades`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData)
    });
    if (!response.ok) {
        throw new Error('Failed to create trade');
    }
    return response.json();
};

export const clearTrades = async () => {
    const response = await fetch(`${API_ENDPOINT}/trades/clear`, {
        method: 'POST'
    });
    return response.json();
};

// Transaction operations
export const getAllTransactions = async () => {
    const response = await fetch(`${API_ENDPOINT}/transactions`);
    return response.json();
};

export const createTransaction = async (transactionData) => {
    const response = await fetch(`${API_ENDPOINT}/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
    });
    return response.json();
};

// Report operations
export const getAllReports = async () => {
    const response = await fetch(`${API_ENDPOINT}/reports`);
    return response.json();
};

export const getUserReports = async (userId) => {
    const response = await fetch(`${API_ENDPOINT}/reports/user/${userId}`);
    return response.json();
};

// Other operations
export const updateUserData = async (userData) => {
    const response = await fetch(`${API_ENDPOINT}/users`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        throw new Error('Failed to update user data');
    }
    return response.json();
};

// Set default balance for all users
export const setDefaultBalance = async (balance) => {
  const response = await fetch(`${API_ENDPOINT}/users/default-balance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ balance }),
  });

  if (!response.ok) {
    throw new Error('Failed to set default balance');
  }

  return response.json();
};

// Local Storage Helpers
export const saveTradesToLocalStorage = (trade) => {
    const existingTrades = JSON.parse(localStorage.getItem('trades') || '[]');
    localStorage.setItem('trades', JSON.stringify([...existingTrades, trade]));
};

export const getTradesFromLocalStorage = () => {
    return JSON.parse(localStorage.getItem('trades') || '[]');
};
