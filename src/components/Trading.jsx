import React, { useState, useEffect, useContext } from 'react';
import { useBroker } from '../context/BrokerContext';
import { UserContext } from '../context/UserContext';
import { getAllTrades, createTrade, saveTradesToLocalStorage, getTradesFromLocalStorage, getAllStocks, updateUser } from '../services/api';
import { API_BASE_URL } from '../config';

const Trading = () => {
  const { currentBroker } = useBroker();
  const { selectedUser, setSelectedUser, users, setUsers } = useContext(UserContext);
  const [trades, setTrades] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [selectedStock, setSelectedStock] = useState('');
  const [tradeType, setTradeType] = useState('buy');
  const [sessionActive, setSessionActive] = useState(false);
  const [portfolio, setPortfolio] = useState([]);  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  // Fetch stocks when component mounts
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const stocksData = await getAllStocks();
        setStocks(Array.isArray(stocksData) ? stocksData : []);
      } catch (error) {
        console.error('Error fetching stocks:', error);
        setError('Failed to fetch stocks');
      }
    };
    fetchStocks();
  }, []);

  useEffect(() => {
    // Check if there's an active session
    const checkSessionStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/active`);
        if (response.ok) {
          const activeSession = await response.json();
          setSessionActive(true);
          setActiveSession(activeSession);
        } else {
          setSessionActive(false);
          setActiveSession(null);
        }
      } catch (err) {
        console.error('Failed to check session status:', err);
        setSessionActive(false);
        setActiveSession(null);
      }
    };

    checkSessionStatus();
    // Check session status every 30 seconds
    const interval = setInterval(checkSessionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch trades when component mounts
  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const trades = await getAllTrades();
        setTrades(Array.isArray(trades) ? trades : []);
      } catch (err) {
        console.error('Failed to fetch trades:', err);
      }
    };

    fetchTrades();
  }, []);

  // Update portfolio whenever trades change
  useEffect(() => {
    if (selectedUser && trades.length > 0) {
      const userTrades = trades.filter(trade => trade.userId === selectedUser);
      const updatedPortfolio = calculatePortfolio(userTrades);
      setPortfolio(updatedPortfolio);
    }
  }, [selectedUser, trades, stocks]);

  const calculatePortfolio = (userTrades) => {
    const portfolioMap = {};
    
    userTrades.forEach(trade => {
      if (!portfolioMap[trade.stockId]) {
        const currentStockPrice = stocks.find(s => s.id === trade.stockId)?.currentPrice || 0;
        portfolioMap[trade.stockId] = {
          stockId: trade.stockId,
          stockName: trade.stock,
          quantity: 0,
          totalCost: 0,
          averagePrice: 0,
          currentPrice: currentStockPrice,
          profitLoss: 0,
          isShort: false
        };
      }
      
      const position = portfolioMap[trade.stockId];
      if (trade.type === 'buy') {
        position.quantity += trade.quantity;
        position.totalCost += trade.total;
        position.isShort = false;
      } else if (trade.type === 'sell') {
        position.quantity -= trade.quantity;
        position.totalCost -= (position.averagePrice * trade.quantity);
      } else if (trade.type === 'short_sell') {
        position.quantity -= trade.quantity; // Negative for short positions
        position.totalCost = trade.total;
        position.isShort = true;
        position.shortPrice = trade.price;
      }
      
      if (position.quantity !== 0) {
        if (position.isShort) {
          position.averagePrice = position.shortPrice;
          // For short positions, profit is when price goes down
          position.profitLoss = (position.shortPrice - position.currentPrice) * Math.abs(position.quantity);
        } else {
          position.averagePrice = Math.abs(position.totalCost / position.quantity);
          position.profitLoss = (position.currentPrice - position.averagePrice) * position.quantity;
        }
      } else {
        position.averagePrice = 0;
        position.profitLoss = 0;
        position.isShort = false;
      }
    });

    return Object.values(portfolioMap).filter(position => position.quantity !== 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!sessionActive) {
      setError('Trading is currently disabled. Please wait for an active session.');
      return;
    }

    if (!selectedUser || !selectedStock || !quantity) {
      setError('Please fill in all required fields');
      return;
    }

    const user = users.find(u => u.id === selectedUser);
    const stock = stocks.find(s => s.id === selectedStock);

    if (!user || !stock) {
      setError('Invalid user or stock selection');
      return;
    }

    const totalCost = stock.currentPrice * quantity;

    try {
      // Validate trade conditions
      if (tradeType === 'buy' && user.balance < totalCost) {
        setError('Insufficient balance');
        return;
      } else if (tradeType === 'sell') {
        const userStock = user.stocks?.find(s => s.id === selectedStock);
        if (!userStock || userStock.quantity < quantity) {
          setError('Insufficient stock quantity');
          return;
        }
      } else if (tradeType === 'short_sell') {
        // Add validation for short selling
        const marginRequired = totalCost * 0.5; // 50% margin requirement
        if (user.balance < marginRequired) {
          setError('Insufficient balance for margin requirement');
          return;
        }
      }

      // Update user data
      const updatedStocks = user.stocks ? [...user.stocks] : [];
      const stockIndex = updatedStocks.findIndex(s => s.id === selectedStock);
      const stock = stocks.find(s => s.id === selectedStock);
      
      // Calculate updated balance based on trade type
      let updatedBalance = user.balance;
      
      if (tradeType === 'buy') {
        if (stockIndex >= 0) {
          const existingStock = updatedStocks[stockIndex];
          
          // Check if we're buying to close a short position
          if (existingStock.isShort) {
            const shortQuantity = Math.abs(existingStock.quantity);
            
            // If buying less than or equal to shorted amount, we're closing some or all of the short position
            if (parseInt(quantity) <= shortQuantity) {
              const closingQuantity = parseInt(quantity);
              const remainingShortQuantity = shortQuantity - closingQuantity;
              
              // Calculate profit/loss from short (only the difference amount)
              const shortProfitLoss = (existingStock.shortPrice - stock.currentPrice) * closingQuantity;
              
              // Update balance with only the profit/loss amount
              updatedBalance = updatedBalance + shortProfitLoss;
              
              if (remainingShortQuantity === 0) {
                // Remove the stock entry if closing the entire position
                updatedStocks.splice(stockIndex, 1);
              } else {
                // Update the stock entry with remaining short position
                updatedStocks[stockIndex] = {
                  ...existingStock,
                  quantity: -remainingShortQuantity,
                  totalCost: existingStock.totalCost * (remainingShortQuantity / shortQuantity)
                };
              }
            } else {
              // If buying more than shorted amount, close the short position and create a new long position
              const remainingBuyQuantity = parseInt(quantity) - shortQuantity;
              
              // Calculate profit/loss from closing the short position
              const shortProfitLoss = (existingStock.shortPrice - stock.currentPrice) * shortQuantity;
              
              // Update balance with profit/loss and cost of additional shares
              updatedBalance = updatedBalance + shortProfitLoss - (stock.currentPrice * remainingBuyQuantity);
              
              // Replace short position with new long position
              updatedStocks[stockIndex] = {
                ...existingStock,
                quantity: remainingBuyQuantity,
                averagePrice: stock.currentPrice,
                totalCost: stock.currentPrice * remainingBuyQuantity,
                isShort: false,
                shortPrice: undefined
              };
            }
          } else {
            // Regular buy to increase an existing long position
            const newQuantity = existingStock.quantity + parseInt(quantity);
            const newTotalCost = existingStock.totalCost + totalCost;
            updatedStocks[stockIndex] = {
              ...existingStock,
              quantity: newQuantity,
              totalCost: newTotalCost,
              averagePrice: newTotalCost / newQuantity,
              isShort: false
            };
            
            // Update balance for regular buy
            updatedBalance -= totalCost;
          }
        } else {
          // Creating a new long position
          updatedStocks.push({
            id: selectedStock,
            name: stock.name,
            quantity: parseInt(quantity),
            averagePrice: stock.currentPrice,
            totalCost: totalCost,
            isShort: false
          });
          
          // Update balance for new long position
          updatedBalance -= totalCost;
        }
      } else if (tradeType === 'sell') {
        if (stockIndex >= 0) {
          const existingStock = updatedStocks[stockIndex];
          const newQuantity = existingStock.quantity - parseInt(quantity);
          const newTotalCost = existingStock.totalCost - (existingStock.averagePrice * parseInt(quantity));
          
          if (newQuantity === 0) {
            updatedStocks.splice(stockIndex, 1);
          } else {
            updatedStocks[stockIndex] = {
              ...existingStock,
              quantity: newQuantity,
              totalCost: newTotalCost,
              averagePrice: newTotalCost / Math.abs(newQuantity)
            };
          }
          
          // Update balance for regular sell
          updatedBalance += totalCost;
        }
      } else if (tradeType === 'short_sell') {
        // For short selling, we don't modify the balance initially
        if (stockIndex >= 0) {
          const existingStock = updatedStocks[stockIndex];
          const newQuantity = existingStock.quantity - parseInt(quantity);
          
          updatedStocks[stockIndex] = {
            ...existingStock,
            quantity: newQuantity,
            totalCost: totalCost,
            averagePrice: stock.currentPrice,
            isShort: true,
            shortPrice: stock.currentPrice
          };
        } else {
          updatedStocks.push({
            id: selectedStock,
            name: stock.name,
            quantity: -parseInt(quantity),
            averagePrice: stock.currentPrice,
            totalCost: totalCost,
            isShort: true,
            shortPrice: stock.currentPrice
          });
        }
        // Balance remains unchanged for short sell
      }

      // Update user data in backend
      const updatedUser = {
        ...user,
        balance: updatedBalance,
        stocks: updatedStocks
      };

      try {
        // Create trade record
        const trade = {
          id: Date.now(),
          date: new Date().toISOString(),
          type: tradeType,
          stock: stock.name,
          stockId: stock.id,
          quantity: parseInt(quantity),
          price: stock.currentPrice,
          total: totalCost,
          userId: selectedUser,
          brokerId: currentBroker.id,
          sessionId: activeSession.id,
          sessionName: activeSession.name
        };

        // Save trade to backend and update user data
        await Promise.all([
          createTrade(trade),
          updateUser(selectedUser, updatedUser)
        ]);

        // Update local state
        setTrades(prevTrades => [...prevTrades, trade]);
        setUsers(prevUsers => prevUsers.map(u => u.id === selectedUser ? updatedUser : u));
        setSuccess(`Trade executed successfully! ${tradeType === 'buy' ? 'Bought' : 'Sold'} ${quantity} shares of ${stock.name}`);
        
        // Reset form
        setQuantity('');
        setSelectedStock('');
      } catch (error) {
        console.error('Trade execution error:', error);
        setError('Failed to execute trade. Please try again.');
      }
    } catch (err) {
      console.error('Trade execution error:', err);
      setError('Failed to execute trade. Please try again.');
    }
  };

  const selectedStockData = stocks.find(s => s.id === selectedStock) || null;
  const totalAmount = selectedStockData && selectedStockData.currentPrice ? selectedStockData.currentPrice * quantity : 0;

  const getSelectedUserBalance = () => {
    const user = users.find(u => u.id === selectedUser);
    return user ? user.balance : 0;
  };

  const getUserStocks = () => {
    if (!selectedUser) return [];
    const user = users.find(u => u.id === selectedUser);
    return user ? user.stocks || [] : [];
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trading</h1>
        <p className="mt-2 text-gray-600">Execute trades for your clients</p>
        {!sessionActive && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="ml-3 text-sm text-yellow-700">
                Trading is currently disabled. Please wait for an active session.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trading Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Selection */}
              <div>
                <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select
                  id="user"
                  value={selectedUser || ""}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              {/* Trade Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trade Type
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setTradeType('buy')}
                    className={`px-4 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                      tradeType === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeType('sell')}
                    className={`px-4 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                      tradeType === 'sell'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Sell
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeType('short_sell')}
                    className={`px-4 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                      tradeType === 'short_sell'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Short Sell
                  </button>
                </div>
              </div>

              {/* Stock Selection */}
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Stock
                </label>
                <select
                  id="stock"
                  required
                  value={selectedStock || ""}
                  onChange={(e) => setSelectedStock(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose a stock</option>
                  {stocks.map(stock => (
                    <option key={stock.id} value={stock.id}>
                      {stock.name} - ₹{(stock.currentPrice || 0).toFixed(2)} {stock.averagePrice ? `(Avg: ₹${stock.averagePrice.toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-sm text-green-600 bg-green-50 rounded-lg p-3">
                  {success}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 border border-transparent rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Execute Trade
              </button>
            </form>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-600">Stock Price</span>
              <span className="text-gray-900 font-medium">
                ₹{selectedStockData && selectedStockData.currentPrice ? selectedStockData.currentPrice.toFixed(2) : '0.00'}
              </span>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-gray-600">Quantity</span>
              <span className="text-gray-900 font-medium">{quantity}</span>
            </div>
            
            <div className="flex justify-between items-center pt-4">
              <span className="text-lg font-bold text-gray-900">Total Amount</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* User Portfolio */}
          {selectedUser && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
              <div className="mb-4 border-b pb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Balance:</span>
                  <span className="text-xl font-semibold">₹{users.find(u => u.id === selectedUser)?.balance.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total P/L:</span>
                  <span className={`text-xl font-semibold ${portfolio.reduce((sum, pos) => sum + pos.profitLoss, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{portfolio.reduce((sum, pos) => sum + pos.profitLoss, 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Portfolio</h3>
              <div className="space-y-2">
                {portfolio.map(position => (
                  <div key={position.stockId} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                    <div>
                      <span className="font-medium">{position.stockName}</span>
                      <span className={`text-sm ml-2 ${position.isShort ? 'text-red-600' : 'text-gray-600'}`}>
                        Qty: {position.isShort ? `(Short) ${Math.abs(position.quantity)}` : position.quantity}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className="font-semibold">
                          {position.isShort ? 'Short Price' : 'Avg Price'}: 
                        </span>
                        <span className="ml-1">₹{position.averagePrice.toFixed(2)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold">Current Price: </span>
                        <span className="ml-1">₹{position.currentPrice.toFixed(2)}</span>
                      </div>
                      <div className={`text-sm font-medium ${position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        P/L: ₹{position.profitLoss.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trading;
