import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllBrokers, getAllSessions, getAllStocks, getAllUsers, getAllTrades,
  createBroker, updateBroker, deleteBroker,
  createSession, updateSession, deleteSession,
  createStock, updateStock, deleteStock,
  createUser, updateUser, deleteUser,
  clearTrades, setDefaultBalance
} from '../services/api';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('brokers');
  const [data, setData] = useState([]);
  const [editItem, setEditItem] = useState(null);
  const [newItem, setNewItem] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [defaultPrice, setDefaultPrice] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionPriceInput, setSessionPriceInput] = useState('');
  const [sessionPrices, setSessionPrices] = useState({});

  useEffect(() => {
    // Parse session price input when it changes
    if (sessionPriceInput) {
      try {
        const prices = {};
        sessionPriceInput.split(',').forEach(pair => {
          const [sessionId, price] = pair.split(':').map(s => s.trim());
          if (sessionId && price && !isNaN(parseFloat(price))) {
            prices[sessionId] = parseFloat(price);
          }
        });
        setSessionPrices(prices);
      } catch (error) {
        console.error('Error parsing session prices:', error);
      }
    } else {
      setSessionPrices({});
    }
  }, [sessionPriceInput]);

  useEffect(() => {
    // Check if user is admin
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadData();
    if (activeTab === 'stocks') {
      setNewItem(prev => ({ ...prev, brokerId: 'B001' }));
    }
    loadSessions();
  }, [activeTab, navigate]);

  const loadSessions = async () => {
    try {
      const response = await getAllSessions();
      // If response is an array directly, use it
      if (Array.isArray(response)) {
        setSessions(response);
      }
      // If response has a sessions property and it's an array, use that
      else if (response && Array.isArray(response.sessions)) {
        setSessions(response.sessions);
      }
      // Otherwise log error and set empty array
      else {
        console.error('Invalid sessions data structure:', response);
        setSessions([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  };

  const loadData = async () => {
    try {
      let response;
      switch (activeTab) {
        case 'brokers':
          response = await getAllBrokers();
          setData(Array.isArray(response) ? response.map(item => ({ ...item, type: 'broker' })) : []);
          break;
        case 'sessions':
          response = await getAllSessions();
          setData(Array.isArray(response) ? response.map(item => ({ ...item, type: 'session' })) : []);
          break;
        case 'stocks':
          response = await getAllStocks();
          setData(Array.isArray(response) ? response.map(item => ({ ...item, type: 'stock' })) : []);
          break;
        case 'users':
          response = await getAllUsers();
          setData(Array.isArray(response) ? response.map(item => ({ ...item, type: 'user' })) : []);
          break;
        case 'trades':
          response = await getAllTrades();
          setData(Array.isArray(response) ? response.map(item => ({ ...item, type: 'trade' })) : []);
          break;
        default:
          setData([]);
      }
      setError('');
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
      setData([]);
    }
  };

  const handleCreate = async () => {
    try {
      if (Object.keys(newItem).length === 0) {
        setError('Please fill in all required fields');
        return;
      }

      let response;
      switch (activeTab) {
        case 'brokers':
          if (!newItem.name) {
            setError('Broker name is required');
            return;
          }
          response = await createBroker({
            name: newItem.name,
            balance: parseFloat(newItem.balance) || 0,
            issuedstock: [],
            receivedstocks: []
          });
          break;
        case 'sessions':
          response = await createSession(newItem);
          break;
        case 'stocks':
          if (!newItem.name || !newItem.brokerId) {
            setError('Stock name and broker are required');
            return;
          }
          
          // Validate session prices
          if (Object.keys(sessionPrices).length === 0) {
            setError('Please enter at least one session price');
            return;
          }

          // Convert sessionPrices object to array format
          const sessionPricesArray = Object.entries(sessionPrices).map(([sessionId, price]) => ({
            sessionId,
            price: price
          }));

          response = await createStock({
            name: newItem.name,
            brokerId: newItem.brokerId,
            sessionPrices: sessionPricesArray
          });
          break;
        case 'users':
          response = await createUser(newItem);
          break;
        default:
          return;
      }

      await loadData();
      setNewItem({});
      setSessionPrices({});
      setSessionPriceInput('');
      setShowCreateModal(false);
      setSuccess('Item created successfully');
      setError('');
    } catch (error) {
      console.error('Error creating item:', error);
      setError('Failed to create item. Please try again.');
    }
  };

  const handleUpdate = async (id) => {
    try {
      if (!editItem) {
        setError('No changes to update');
        return;
      }

      switch (activeTab) {
        case 'brokers':
          await updateBroker(id, editItem);
          break;
        case 'sessions':
          await updateSession(id, editItem);
          break;
        case 'stocks':
          await updateStock(id, editItem);
          break;
        case 'users':
          await updateUser(id, editItem);
          break;
        default:
          return;
      }

      await loadData();
      setEditItem(null);
      setShowEditModal(false);
      setSuccess('Item updated successfully');
      setError('');
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item. Please try again.');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      switch (type) {
        case 'brokers':
          await deleteBroker(id);
          break;
        case 'sessions':
          await deleteSession(id);
          break;
        case 'stocks':
          await deleteStock(id);
          break;
        case 'users':
          await deleteUser(id);
          break;
        default:
          setError(`Invalid type: ${type}`);
          return;
      }

      await loadData();
      setSuccess(`${type.slice(0, -1)} deleted successfully`);
      setError('');
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setError(error.message || `Failed to delete ${type}. Please try again.`);
      setSuccess('');
    }
  };

  const handleClearTrades = async () => {
    if (!window.confirm('Are you sure you want to clear all trades? This will reset all stock quantities and user balances.')) {
      return;
    }

    try {
      await clearTrades();
      await loadData();
      setSuccess('Trades cleared successfully');
    } catch (error) {
      console.error('Error clearing trades:', error);
      setError('Failed to clear trades. Please try again.');
    }
  };

  const handleSetDefaultPrice = async () => {
    try {
      const price = parseFloat(defaultPrice);
      if (isNaN(price) || price <= 0) {
        setError('Please enter a valid price');
        return;
      }

      // Update stock prices
      const stocks = await getAllStocks();
      for (const stock of stocks) {
        await updateStock(stock.id, { 
          ...stock, 
          currentPrice: price,
          isDefaultPriceUpdate: true
        });
      }

      // Update user balances
      await setDefaultBalance(price);

      setDefaultPrice('');
      await loadData();
      setSuccess('Stock prices and user balances updated successfully');
    } catch (error) {
      console.error('Error updating prices and balances:', error);
      setError('Failed to update prices and balances. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <div className="flex space-x-4 mb-4">
          {['brokers', 'sessions', 'stocks', 'users', 'trades'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize ${
                activeTab === tab
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        {activeTab !== 'trades' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
          >
            Create New {activeTab.slice(0, -1)}
          </button>
        )}
        {activeTab === 'trades' && (
          <button
            onClick={handleClearTrades}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Clear All Trades
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create New {activeTab.slice(0, -1)}</h2>
            <div className="space-y-4">
              {activeTab === 'brokers' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Balance</label>
                    <input
                      type="number"
                      value={newItem.balance || ''}
                      onChange={(e) => setNewItem({ ...newItem, balance: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              {activeTab === 'users' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Balance</label>
                    <input
                      type="number"
                      value={newItem.balance || ''}
                      onChange={(e) => setNewItem({ ...newItem, balance: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Broker</label>
                    <select
                      value={newItem.brokerId || ''}
                      onChange={(e) => setNewItem({ ...newItem, brokerId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Broker</option>
                      {data.filter(d => d.type === 'broker').map(broker => (
                        <option key={broker.id} value={broker.id}>{broker.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {activeTab === 'stocks' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value, brokerId: 'B001' })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter stock name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Session Prices</label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600 mb-2">
                        Enter prices in format: S001: 10, S002: 100, ...
                      </div>
                      <input
                        type="text"
                        value={sessionPriceInput}
                        onChange={(e) => setSessionPriceInput(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="S001: 10, S002: 100, ..."
                      />
                      {Object.keys(sessionPrices).length > 0 && (
                        <div className="text-sm text-gray-600 mt-2">
                          Parsed Prices:
                          <ul className="mt-1 space-y-1">
                            {Object.entries(sessionPrices).map(([sessionId, price]) => (
                              <li key={sessionId}>
                                {sessionId}: {price}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewItem({});
                  setSessionPriceInput('');
                  setSessionPrices({});
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit {activeTab.slice(0, -1)}</h2>
            <div className="space-y-4">
              {activeTab === 'brokers' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={editItem?.name || ''}
                      onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Balance</label>
                    <input
                      type="number"
                      value={editItem?.balance || ''}
                      onChange={(e) => setEditItem({ ...editItem, balance: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              {activeTab === 'users' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={editItem?.name || ''}
                      onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Balance</label>
                    <input
                      type="number"
                      value={editItem?.balance || ''}
                      onChange={(e) => setEditItem({ ...editItem, balance: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Broker</label>
                    <select
                      value={editItem?.brokerId || ''}
                      onChange={(e) => setEditItem({ ...editItem, brokerId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Broker</option>
                      {data.filter(d => d.type === 'broker').map(broker => (
                        <option key={broker.id} value={broker.id}>{broker.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {activeTab === 'stocks' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={editItem?.name || ''}
                      onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Initial Price</label>
                    <input
                      type="number"
                      value={editItem?.initialPrice || ''}
                      onChange={(e) => setEditItem({ ...editItem, initialPrice: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Price</label>
                    <input
                      type="number"
                      value={editItem?.currentPrice || ''}
                      onChange={(e) => setEditItem({ ...editItem, currentPrice: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Broker</label>
                    <select
                      value={editItem?.brokerId || ''}
                      onChange={(e) => setEditItem({ ...editItem, brokerId: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Broker</option>
                      {data.filter(d => d.type === 'broker').map(broker => (
                        <option key={broker.id} value={broker.id}>{broker.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditItem(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate(editItem.id)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name/ID
              </th>
              {(activeTab === 'brokers' || activeTab === 'users') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">{item.name || item.id}</td>
                {(activeTab === 'brokers' || activeTab === 'users') && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.balance !== undefined && `Balance: ${item.balance}`}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">
                  {activeTab !== 'trades' && activeTab !== 'sessions' && (
                    <button
                      onClick={() => {
                        setEditItem(item);
                        setShowEditModal(true);
                      }}
                      className="text-purple-500 hover:text-purple-900 mr-4"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(activeTab, item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
