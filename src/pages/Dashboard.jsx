import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { getAllStocks, getActiveSession, getAllTransactions } from '../services/api';
import SessionControl from '../components/SessionControl';

const Dashboard = () => {
  const [stocks, setStocks] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isReset, setIsReset] = useState(true); // Initialize as true to show 0% at start
  const [hasStarted, setHasStarted] = useState(false); // Track if trading has started

  // Define colors for each stock
  const stockColors = {
    'Eicher Motors': '#2E7D32',
    'Suzlon Energy': '#1976D2',
    'Zomato': '#6A1B9A',
    'Adani Green': '#D32F2F',
    'Titan': '#F57C00',
    'HDFC': '#0097A7',
    'ITC': '#7B1FA2',
    'Vedanta': '#455A64'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active session first
        const sessionData = await getActiveSession();
        
        // Check if session is reset or if trading hasn't started
        if (!sessionData) {
          setIsReset(true);
          setHasStarted(false);
          setActiveSession(null);
        } else if (sessionData.status === 'reset') {
          setIsReset(true);
          setHasStarted(false);
          setActiveSession(null);
        } else if (sessionData.id === 'S001') {
          setIsReset(false);
          setHasStarted(false);
          setActiveSession(sessionData);
        } else {
          setIsReset(false);
          setHasStarted(true);
          setActiveSession(sessionData);
        }

        // Fetch stocks after getting session data
        const stocksData = await getAllStocks();
        setStocks(stocksData);

        // Set watchlist with current stock data
        const updatedWatchlist = stocksData.map(stock => {
          // Calculate change from initial price
          const currentPrice = stock.currentPrice || 0;
          const initialPrice = stock.initialPrice || currentPrice;
          const priceChange = currentPrice - initialPrice;
          // Show 0% change if not started, reset, or in session 1
          const percentChange = !hasStarted || isReset || (sessionData?.id === 'S001') ? 
            0 : 
            (priceChange / initialPrice) * 100;
          
          return {
            id: stock.id,
            symbol: stock.name,
            price: `₹${currentPrice.toFixed(2)}`,
            priceValue: currentPrice,
            initialPrice: initialPrice,
            change: `${percentChange === 0 ? '0.00' : percentChange > 0 ? '+' + percentChange.toFixed(2) : percentChange.toFixed(2)}%`,
            changeValue: percentChange,
            volume: stock.shares || 0,
            trend: percentChange === 0 ? 'neutral' : (percentChange > 0 ? 'up' : 'down')
          };
        });
        
        setWatchlist(updatedWatchlist);
        
        // Set the first stock as selected by default if none is selected
        if (!selectedStock && updatedWatchlist.length > 0) {
          setSelectedStock(updatedWatchlist[0].symbol);
        }

        // Clear historical data if reset
        if (isReset) {
          setHistoricalData([]);
        } else {
          // Prepare historical data for chart
          const sessions = ['S001', 'S002', 'S003', 'S004', 'S005', 'S006'];
          
          // Get current session number and show only previous sessions
          const currentSessionIndex = sessionData ? sessions.indexOf(sessionData.id) : -1;
          const visibleSessions = currentSessionIndex > 0 ? sessions.slice(0, currentSessionIndex) : [];

          const chartData = visibleSessions.map(sessionId => {
            const dataPoint = {
              session: sessionId.replace('S00', 'Session '),
            };
            
            stocksData.forEach(stock => {
              const sessionPrice = stock.sessionPrices.find(sp => sp.sessionId === sessionId);
              if (sessionPrice) {
                dataPoint[stock.name] = sessionPrice.price;
              }
            });
            
            return dataPoint;
          });

          setHistoricalData(chartData);
        }

        // Fetch recent transactions
        const transactionsData = await getAllTransactions();
        setTransactions(transactionsData);

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    // Refresh data every 5 seconds to match session changes
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [selectedStock, isReset]);

  return (
    <div className="p-4">
      <div className="mb-6">
        <SessionControl />
      </div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Market Dashboard</h1>
        {activeSession && (
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 px-4 py-2 rounded-lg">
              <span className="text-purple-800 font-medium">Session: {activeSession.name}</span>
            </div>
            <div className="bg-green-100 px-4 py-2 rounded-lg">
              <span className="text-green-800 font-medium">Status: {activeSession.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Market Watch */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Market Watch</h2>
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Symbol</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Price</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Change</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Volume</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((stock) => (
                <tr 
                  key={stock.id}
                  onClick={() => setSelectedStock(stock.symbol)}
                  className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedStock === stock.symbol ? 'bg-purple-50' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{stock.symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-gray-900">{stock.price}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${stock.changeValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stock.change}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-gray-900">{stock.volume}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-block w-3 h-3 rounded-full ${
                      stock.trend === 'up' ? 'bg-green-500' :
                      stock.trend === 'down' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Market Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {selectedStock ? `${selectedStock} Price History` : 'Market Overview'}
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={historicalData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="session" 
                label={{ value: 'Trading Sessions', position: 'insideBottom', offset: -5 }}
                tick={{ fontSize: 12, fill: '#666' }}
                stroke="#888"
              />
              <YAxis 
                label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', offset: -5 }}
                domain={['dataMin - 100', 'dataMax + 100']}
                tick={{ fontSize: 12, fill: '#666' }}
                tickFormatter={(value) => `₹${value}`}
                stroke="#888"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '4px',
                  padding: '8px',
                  border: '1px solid #ddd',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
                labelFormatter={(label) => `Session ${label.split(' ')[1]}`}
              />
              {selectedStock && (
                <Line
                  type="monotoneX"
                  dataKey={selectedStock}
                  stroke={stockColors[selectedStock]}
                  strokeWidth={2.5}
                  dot={{ 
                    r: 4, 
                    strokeWidth: 2, 
                    fill: '#fff',
                    stroke: stockColors[selectedStock]
                  }}
                  activeDot={{ 
                    r: 6, 
                    strokeWidth: 2,
                    stroke: stockColors[selectedStock],
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
