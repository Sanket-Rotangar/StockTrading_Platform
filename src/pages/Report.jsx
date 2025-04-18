import React, { useState, useEffect } from 'react';
import { getAllTrades, getAllStocks, getAllUsers, getAllBrokers } from '../services/api';

const Report = () => {
  const [trades, setTrades] = useState([]);
  const [filteredTrades, setFilteredTrades] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    user: '',
    stock: '',
    broker: '',
    session: ''
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tradesData, stocksData, usersData, brokersData] = await Promise.all([
          getAllTrades(),
          getAllStocks(),
          getAllUsers(),
          getAllBrokers()
        ]);

        // Create predefined sessions
        const predefinedSessions = [
          { id: 'S001', name: 'Session 1' },
          { id: 'S002', name: 'Session 2' },
          { id: 'S003', name: 'Session 3' },
          { id: 'S004', name: 'Session 4' },
          { id: 'S005', name: 'Session 5' },
          { id: 'S006', name: 'Session 6' }
        ];

        // Group trades by stock to track average buy price
        const stockTradeMap = {};
        
        // First pass: Initialize and track buy trades
        tradesData.forEach(trade => {
          if (!stockTradeMap[trade.stockId]) {
            stockTradeMap[trade.stockId] = {
              totalBuyQuantity: 0,
              totalBuyValue: 0,
              trades: []
            };
          }
          stockTradeMap[trade.stockId].trades.push(trade);
          
          if (trade.type === 'buy') {
            stockTradeMap[trade.stockId].totalBuyValue += trade.price * trade.quantity;
            stockTradeMap[trade.stockId].totalBuyQuantity += trade.quantity;
          }
        });

        // Calculate profit/loss for each trade
        const tradesWithPL = tradesData.map(trade => {
          const stock = stocksData.find(s => s.name === trade.stock);
          const currentPrice = stock ? stock.currentPrice : 0;
          const stockTrades = stockTradeMap[trade.stockId];
          let profitLoss = 0;

          if (trade.type === 'buy') {
            profitLoss = (currentPrice - trade.price) * trade.quantity;
          } else if (trade.type === 'sell') {
            const avgBuyPrice = stockTrades.totalBuyQuantity > 0 
              ? stockTrades.totalBuyValue / stockTrades.totalBuyQuantity 
              : 0;
            profitLoss = (trade.price - avgBuyPrice) * trade.quantity;
          }

          return {
            ...trade,
            profitLoss,
            currentPrice,
            sessionName: trade.sessionName || `Session ${trade.sessionId}` || 'No Session'
          };
        });

        // Sort by date descending by default
        const sortedTrades = tradesWithPL.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );

        setTrades(sortedTrades);
        setFilteredTrades(sortedTrades);
        setStocks(stocksData);
        setUsers(usersData);
        setBrokers(brokersData);
        setSessions(predefinedSessions);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...trades];

    // Apply filters
    if (filters.user) {
      result = result.filter(trade => trade.userId === filters.user);
    }
    if (filters.stock) {
      result = result.filter(trade => trade.stockId === filters.stock);
    }
    if (filters.broker) {
      result = result.filter(trade => trade.brokerId === filters.broker);
    }
    if (filters.session) {
      result = result.filter(trade => trade.sessionId === filters.session || (trade.sessionName && sessions.find(session => session.name === trade.sessionName && session.id === filters.session)));
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      
      if (sortConfig.key === 'sessionName') {
        // Extract session numbers for comparison
        const getSessionNumber = (name) => {
          const match = name ? name.match(/\d+/) : null;
          return match ? parseInt(match[0]) : 999; // Default to high number for unknown sessions
        };
        const aSession = getSessionNumber(a.sessionName);
        const bSession = getSessionNumber(b.sessionName);
        
        return sortConfig.direction === 'asc'
          ? aSession - bSession
          : bSession - aSession;
      }
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    setFilteredTrades(result);
  }, [trades, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Add helper function to determine trading session
  const getTradeSession = (date) => {
    const tradeHour = new Date(date).getHours();
    if (tradeHour >= 9 && tradeHour < 15) {
      return 'NORMAL';
    } else if (tradeHour >= 15 && tradeHour < 17) {
      return 'CLOSING';
    } else {
      return 'PRE/POST';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Transaction Report</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.user}
              onChange={(e) => setFilters(prev => ({ ...prev, user: e.target.value }))}
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.stock}
              onChange={(e) => setFilters(prev => ({ ...prev, stock: e.target.value }))}
            >
              <option value="">All Stocks</option>
              {stocks.map(stock => (
                <option key={stock.id} value={stock.id}>{stock.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.broker}
              onChange={(e) => setFilters(prev => ({ ...prev, broker: e.target.value }))}
            >
              <option value="">All Brokers</option>
              {brokers.map(broker => (
                <option key={broker.id} value={broker.id}>{broker.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <select
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filters.session}
              onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value }))}
            >
              <option value="">All Sessions</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>{session.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('date')}>
                  Date & Time {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}>
                  Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('stock')}>
                  Stock {sortConfig.key === 'stock' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('quantity')}>
                  Quantity {sortConfig.key === 'quantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}>
                  Price {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Price
                </th>
                <th scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('sessionName')}>
                  Session {sortConfig.key === 'sessionName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(trade.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.quantity || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(trade.price || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(trade.totalAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(trade.currentPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      trade.sessionId 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {trade.sessionName || 'Unknown Session'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Report;
