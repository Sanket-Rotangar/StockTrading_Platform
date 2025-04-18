import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const Login = () => {
  const navigate = useNavigate();
  const [brokerName, setBrokerName] = useState('');
  const [error, setError] = useState('');
  const [brokers, setBrokers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchBrokers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/brokers`);
        const data = await response.json();
        const brokersArray = Array.isArray(data) ? data : data.brokers || [];
        setBrokers(brokersArray.filter(b => !b.admin)); // Filter out admin brokers from suggestions
      } catch (err) {
        console.error('Error fetching brokers:', err);
      }
    };
    fetchBrokers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/brokers`);
      const data = await response.json();
      const brokersArray = Array.isArray(data) ? data : data.brokers || [];
      const broker = brokersArray.find(b => b.name.toLowerCase() === brokerName.toLowerCase());

      if (broker) {
        localStorage.setItem('currentBroker', JSON.stringify(broker));
        localStorage.setItem('isAdmin', broker.admin === "true");
        navigate('/dashboard');
      } else {
        setError('Invalid broker name. Please try again.');
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h2 className="mt-4 text-3xl font-bold text-gray-900">TradingX</h2>
          <p className="mt-2 text-gray-600">Sign in to your broker account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="brokerName" className="block text-sm font-medium text-gray-700">
              Broker Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="brokerName"
                value={brokerName}
                onChange={(e) => {
                  setBrokerName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="mt-1 block w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your broker name"
                required
              />
              {showSuggestions && brokers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {brokers.map((broker) => (
                    <div
                      key={broker.id}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setBrokerName(broker.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {broker.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 border border-transparent rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
