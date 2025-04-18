import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const BrokerContext = createContext();

export const BrokerProvider = ({ children }) => {
  const [currentBroker, setCurrentBroker] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for logged in broker on mount
    const storedBroker = localStorage.getItem('currentBroker');
    if (storedBroker) {
      setCurrentBroker(JSON.parse(storedBroker));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('currentBroker');
    setCurrentBroker(null);
    navigate('/login');
  };

  return (
    <BrokerContext.Provider value={{ currentBroker, setCurrentBroker, logout }}>
      {children}
    </BrokerContext.Provider>
  );
};

export const useBroker = () => {
  const context = useContext(BrokerContext);
  if (!context) {
    throw new Error('useBroker must be used within a BrokerProvider');
  }
  return context;
};
