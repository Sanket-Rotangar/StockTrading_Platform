import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Join room for specific data types
  ['brokers', 'users', 'stocks', 'trades', 'sessions'].forEach(type => {
    socket.on(`join_${type}`, () => {
      socket.join(type);
      console.log(`Client ${socket.id} joined ${type} room`);
    });
  });
});

// Helper function to emit updates to connected clients
const emitUpdate = (type, data) => {
  io.to(type).emit(`${type}_update`, data);
};

// Helper function to read JSON files
const readJsonFile = async (filename) => {
    try {
        const filePath = join(__dirname, '../db', filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        // If file doesn't exist, return default structure
        if (error.code === 'ENOENT') {
            const defaultData = {
                trades: [],
                users: [],
                brokers: [],
                stocks: []
            };
            return filename === 'trades.json' ? { trades: [] } : 
                   filename === 'users.json' ? { users: [] } : 
                   filename === 'brokers.json' ? { brokers: [] } : 
                   filename === 'stocks.json' ? { stocks: [] } : 
                   filename === 'transactions.json' ? { transactions: [] } : defaultData;
        }
        throw error;
    }
};

// Helper function to write JSON files
const writeJsonFile = async (filename, data) => {
    try {
        const filePath = join(__dirname, '../db', filename);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        
        // Emit updates based on file type
        const type = filename.replace('.json', '');
        if (['brokers', 'users', 'stocks', 'trades', 'sessions'].includes(type)) {
            emitUpdate(type, data[type] || []);
        }
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        throw error;
    }
};

// Get all brokers
app.get('/api/brokers', async (req, res) => {
    try {
        const data = await readJsonFile('brokers.json');
        res.json(data.brokers || []);
    } catch (error) {
        console.error('Error reading brokers:', error);
        res.status(500).json({ error: 'Error reading brokers data' });
    }
});

// Get broker by ID
app.get('/api/brokers/:id', async (req, res) => {
    try {
        const data = await readJsonFile('brokers.json');
        const broker = data.brokers.find(b => b.id === req.params.id);
        if (!broker) {
            return res.status(404).json({ error: 'Broker not found' });
        }
        res.json(broker);
    } catch (error) {
        console.error('Error reading broker:', error);
        res.status(500).json({ error: 'Error reading broker data' });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const data = await readJsonFile('users.json');
        res.json(data.users || []);
    } catch (error) {
        console.error('Error reading users:', error);
        res.status(500).json({ error: 'Error reading users data' });
    }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const data = await readJsonFile('users.json');
        const user = data.users.find(u => u.id === req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error reading user:', error);
        res.status(500).json({ error: 'Error reading user data' });
    }
});

// Get all stocks with session prices
app.get('/api/stocks', async (req, res) => {
    try {
        const data = await readJsonFile('stocks.json');
        if (!data || !data.stocks) {
            return res.json([]);
        }

        try {
            const activeSessionResponse = await readJsonFile('sessions.json');
            // If there's an active session and valid session data, update current prices
            if (activeSessionResponse && activeSessionResponse.sessions) {
                const activeSession = activeSessionResponse.sessions.find(s => s.status === 'active');
                if (activeSession) {
                    data.stocks = data.stocks.map(stock => {
                        if (stock.sessionPrices && Array.isArray(stock.sessionPrices)) {
                            const sessionPrice = stock.sessionPrices.find(sp => sp.sessionId === activeSession.id);
                            return {
                                ...stock,
                                currentPrice: sessionPrice ? sessionPrice.price : stock.currentPrice
                            };
                        }
                        return stock;
                    });
                }
            }
        } catch (sessionError) {
            console.error('Error reading session data:', sessionError);
            // Continue with returning stocks even if session data is unavailable
        }
        
        res.json(data.stocks);
    } catch (error) {
        console.error('Error reading stocks:', error);
        res.status(500).json({ error: 'Error reading stocks data' });
    }
});

// Get stock by ID
app.get('/api/stocks/:id', async (req, res) => {
    try {
        const data = await readJsonFile('stocks.json');
        const stock = data.stocks.find(s => s.id === req.params.id);
        if (!stock) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        res.json(stock);
    } catch (error) {
        console.error('Error reading stock:', error);
        res.status(500).json({ error: 'Error reading stock data' });
    }
});

// Session routes - specific routes first
app.get('/api/sessions/active', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        const activeSession = data.sessions.find(s => s.status === 'active');
        
        if (!activeSession) {
            return res.status(404).json({ error: 'No active session found' });
        }
        res.json(activeSession);
    } catch (error) {
        console.error('Error reading active session:', error);
        res.status(500).json({ error: 'Error reading active session' });
    }
});

app.post('/api/sessions/start', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        const pendingSessions = data.sessions.filter(s => s.status === 'pending');
        
        if (pendingSessions.length === 0) {
            return res.status(400).json({ error: 'No pending sessions available' });
        }

        // Find first pending session
        const sessionToStart = pendingSessions[0];
        sessionToStart.status = 'active';
        sessionToStart.startTime = new Date().toISOString();
        sessionToStart.endTime = new Date(Date.now() + 10 * 60000).toISOString(); // 10 minutes duration

        // Mark previous active session as completed
        const previousActive = data.sessions.find(s => s.id !== sessionToStart.id && s.status === 'active');
        if (previousActive) {
            previousActive.status = 'completed';
        }

        await writeJsonFile('sessions.json', data);
        res.json(sessionToStart);
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Error starting session' });
    }
});

app.post('/api/sessions/end', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        const activeSession = data.sessions.find(s => s.status === 'active');
        
        if (!activeSession) {
            return res.status(400).json({ error: 'No active session found' });
        }

        activeSession.status = 'completed';
        activeSession.endTime = new Date().toISOString();

        await writeJsonFile('sessions.json', data);
        res.json(activeSession);
    } catch (error) {
        console.error('Error ending session:', error);
        res.status(500).json({ error: 'Error ending session' });
    }
});

app.post('/api/sessions/next', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        const currentActive = data.sessions.find(s => s.status === 'active');
        
        if (currentActive) {
            currentActive.status = 'completed';
            currentActive.endTime = new Date().toISOString();
        }

        const nextSession = data.sessions.find(s => s.status === 'pending');
        if (!nextSession) {
            return res.status(400).json({ error: 'No more sessions available' });
        }

        nextSession.status = 'active';
        nextSession.startTime = new Date().toISOString();
        nextSession.endTime = new Date(Date.now() + 10 * 60000).toISOString(); // 10 minutes duration

        await writeJsonFile('sessions.json', data);
        res.json(nextSession);
    } catch (error) {
        console.error('Error moving to next session:', error);
        res.status(500).json({ error: 'Error moving to next session' });
    }
});

app.post('/api/sessions/reset', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        
        // Reset all sessions to pending state
        data.sessions = data.sessions.map(session => ({
            ...session,
            status: 'pending',
            startTime: null,
            endTime: null
        }));

        await writeJsonFile('sessions.json', data);
        res.json({ message: 'All sessions have been reset', sessions: data.sessions });
    } catch (error) {
        console.error('Error resetting sessions:', error);
        res.status(500).json({ error: 'Error resetting sessions' });
    }
});

// Create session
app.post('/api/sessions', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        const newSession = {
            id: req.body.id,
            name: req.body.name,
            story: req.body.story,
            startTime: null,
            endTime: null,
            status: 'pending'
        };
        
        data.sessions.push(newSession);
        await writeJsonFile('sessions.json', data);
        res.status(201).json(newSession);
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Error creating session' });
    }
});

// Session endpoints
app.get('/api/sessions', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        res.json(data.sessions || []);
    } catch (error) {
        console.error('Error reading sessions:', error);
        res.status(500).json({ error: 'Failed to read sessions' });
    }
});

app.put('/api/sessions/:id', (req, res) => {
    try {
        const sessionId = req.params.id;
        const sessionData = req.body;
        const sessionsPath = join(__dirname, '../db/sessions.json');
        const sessions = JSON.parse(fs.readFileSync(sessionsPath));
        
        const sessionIndex = sessions.sessions.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) {
            return res.status(404).json({ error: 'Session not found' });
        }

        sessions.sessions[sessionIndex] = {
            ...sessions.sessions[sessionIndex],
            ...sessionData
        };

        fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
        res.json(sessions.sessions[sessionIndex]);
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({ error: 'Failed to update session' });
    }
});

// Delete session
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        const data = await readJsonFile('sessions.json');
        const index = data.sessions.findIndex(s => s.id === req.params.id);
        
        if (index === -1) {
            console.error(`Session with id ${req.params.id} not found`);
            return res.status(404).json({ error: 'Session not found' });
        }
        
        const deletedSession = data.sessions[index];
        data.sessions.splice(index, 1);
        await writeJsonFile('sessions.json', data);
        res.json({ message: 'Session deleted successfully', session: deletedSession });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Error deleting session' });
    }
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
    try {
        const data = await readJsonFile('transactions.json');
        res.json(data.transactions || []);
    } catch (error) {
        console.error('Error reading transactions:', error);
        res.status(500).json({ error: 'Error reading transactions data' });
    }
});

// Create new transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const { buyerId, sellerId, brokerId, stockId, quantity, price, sessionId, type } = req.body;
        
        if (type === 'short_sell') {
            // Handle short selling logic
            // Ensure the stock can be borrowed and update records accordingly
            // Add logic to manage short selling transactions
            const stocksData = await readJsonFile('stocks.json');
            const stock = stocksData.stocks.find(s => s.id === stockId);
            if (!stock) {
                return res.status(404).json({ error: 'Stock not found' });
            }
            if (stock.shares < quantity) {
                return res.status(400).json({ error: 'Insufficient shares to borrow' });
            }
            stock.shares -= quantity;
            await writeJsonFile('stocks.json', stocksData);
        } else {
            // Existing transaction logic
            // Read current transactions
            const transactionsData = await readJsonFile('transactions.json');
            
            // Create new transaction
            const newTransaction = {
                id: `T${(transactionsData.transactions.length + 1).toString().padStart(3, '0')}`,
                buyerId,
                sellerId,
                brokerId,
                stockId,
                quantity,
                price,
                timestamp: new Date().toISOString(),
                sessionId
            };
            
            // Update transactions file
            transactionsData.transactions.push(newTransaction);
            await writeJsonFile('transactions.json', transactionsData);

            // Update stock quantities and user balances
            await updateStockAndUserData(newTransaction);
        }
        
        res.status(201).json({ message: 'Transaction created successfully' });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Error creating transaction' });
    }
});

// Helper function to update stock and user data after transaction
async function updateStockAndUserData(transaction) {
    try {
        // Update stocks
        const stocksData = await readJsonFile('stocks.json');
        const stock = stocksData.stocks.find(s => s.id === transaction.stockId);
        if (stock) {
            stock.shares -= transaction.quantity;
            await writeJsonFile('stocks.json', stocksData);
        }

        // Update user balances
        const usersData = await readJsonFile('users.json');
        const buyer = usersData.users.find(u => u.id === transaction.buyerId);
        const seller = usersData.users.find(u => u.id === transaction.sellerId);
        
        if (buyer) {
            buyer.balance -= transaction.price * transaction.quantity;
            if (!buyer.stocks) buyer.stocks = [];
            buyer.stocks.push({
                stockId: transaction.stockId,
                quantity: transaction.quantity
            });
        }
        
        if (seller) {
            seller.balance += transaction.price * transaction.quantity;
        }
        
        await writeJsonFile('users.json', usersData);
    } catch (error) {
        console.error('Error updating stock and user data:', error);
        throw error;
    }
}

// Get reports
app.get('/api/reports', async (req, res) => {
    try {
        const data = await readJsonFile('reports.json');
        res.json(data.reports || []);
    } catch (error) {
        console.error('Error reading reports:', error);
        res.status(500).json({ error: 'Error reading reports data' });
    }
});

// Get report by user ID
app.get('/api/reports/user/:userId', async (req, res) => {
    try {
        const data = await readJsonFile('reports.json');
        const userReports = data.reports.filter(r => r.userId === req.params.userId);
        res.json(userReports);
    } catch (error) {
        console.error('Error reading user reports:', error);
        res.status(500).json({ error: 'Error reading user reports' });
    }
});

// Get all trades
app.get('/api/trades', async (req, res) => {
    try {
        const data = await readJsonFile('trades.json');
        res.json(data.trades || []);
    } catch (error) {
        console.error('Error reading trades:', error);
        res.status(500).json({ error: 'Error reading trades data' });
    }
});

// Create new trade
app.post('/api/trades', async (req, res) => {
    try {
        const tradeData = req.body;
        let data = await readJsonFile('trades.json');
        
        // Initialize trades array if it doesn't exist
        if (!data.trades) {
            data = { trades: [] };
        }
        
        // Add new trade
        data.trades.push(tradeData);
        
        // Save updated trades
        await writeJsonFile('trades.json', data);
        
        res.status(201).json(tradeData);
    } catch (error) {
        console.error('Error creating trade:', error);
        res.status(500).json({ error: 'Error creating trade' });
    }
});

// Update users data
app.put('/api/users', async (req, res) => {
    try {
        const { users } = req.body;
        if (!Array.isArray(users)) {
            return res.status(400).json({ error: 'Invalid users data format' });
        }
        
        const data = { users };
        
        // Save updated users
        await writeJsonFile('users.json', data);
        
        res.json({ message: 'Users updated successfully', users });
    } catch (error) {
        console.error('Error updating users:', error);
        res.status(500).json({ error: 'Error updating users data' });
    }
});

// Admin CRUD Operations

// Brokers CRUD
app.post('/api/brokers', async (req, res) => {
    try {
        const data = await readJsonFile('brokers.json');
        const newBroker = {
            id: `B${String(data.brokers.length + 1).padStart(3, '0')}`,
            name: req.body.name,
            balance: parseFloat(req.body.balance) || 0
        };
        data.brokers.push(newBroker);
        await writeJsonFile('brokers.json', data);
        res.json(newBroker);
    } catch (error) {
        console.error('Error creating broker:', error);
        res.status(500).json({ error: 'Error creating broker' });
    }
});

app.put('/api/brokers/:id', async (req, res) => {
    try {
        const data = await readJsonFile('brokers.json');
        const index = data.brokers.findIndex(b => b.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Broker not found' });
        }
        
        const updatedBroker = {
            ...data.brokers[index],
            name: req.body.name,
            balance: parseFloat(req.body.balance) || 0
        };
        
        data.brokers[index] = updatedBroker;
        await writeJsonFile('brokers.json', data);
        res.json(updatedBroker);
    } catch (error) {
        console.error('Error updating broker:', error);
        res.status(500).json({ error: 'Error updating broker' });
    }
});

// Delete broker
app.delete('/api/brokers/:id', async (req, res) => {
    try {
        const data = await readJsonFile('brokers.json');
        const index = data.brokers.findIndex(b => b.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Broker not found' });
        }
        
        data.brokers.splice(index, 1);
        await writeJsonFile('brokers.json', data);
        res.json({ message: 'Broker deleted successfully' });
    } catch (error) {
        console.error('Error deleting broker:', error);
        res.status(500).json({ error: 'Error deleting broker' });
    }
});

// Users CRUD
app.post('/api/users', async (req, res) => {
    try {
        const data = await readJsonFile('users.json');
        const newUser = {
            id: `U${String(data.users.length + 1).padStart(3, '0')}`,
            name: req.body.name,
            balance: parseFloat(req.body.balance) || 0,
            stocks: [],
            brokerId: req.body.brokerId
        };
        data.users.push(newUser);
        await writeJsonFile('users.json', data);
        res.json(newUser);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const data = await readJsonFile('users.json');
        const index = data.users.findIndex(u => u.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const updatedUser = {
            ...data.users[index],
            ...req.body,  
            id: req.params.id,  
            balance: parseFloat(req.body.balance) || data.users[index].balance,
            stocks: Array.isArray(req.body.stocks) ? req.body.stocks : data.users[index].stocks || []
        };

        data.users[index] = updatedUser;
        await writeJsonFile('users.json', data);
        res.json(updatedUser);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Error updating user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const data = await readJsonFile('users.json');
        const index = data.users.findIndex(u => u.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        data.users.splice(index, 1);
        await writeJsonFile('users.json', data);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
});

// Stocks CRUD
app.post('/api/stocks', async (req, res) => {
    try {
        const data = await readJsonFile('stocks.json');
        const newStock = {
            id: `${req.body.name.replace(/\s+/g, '').toUpperCase()}${String(data.stocks.length + 1).padStart(3, '0')}`,
            name: req.body.name,
            brokerId: req.body.brokerId,
            sessionPrices: req.body.sessionPrices || []
        };
        
        data.stocks.push(newStock);
        await writeJsonFile('stocks.json', data);
        
        // Emit update to connected clients
        emitUpdate('stocks', data.stocks);
        
        res.json(newStock);
    } catch (error) {
        console.error('Error creating stock:', error);
        res.status(500).json({ error: 'Failed to create stock' });
    }
});

app.put('/api/stocks/:id', async (req, res) => {
    try {
        const data = await readJsonFile('stocks.json');
        const index = data.stocks.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Stock not found' });
        }

        // If updating price, update currentPrice
        if (req.body.currentPrice) {
            data.stocks[index].currentPrice = parseFloat(req.body.currentPrice);
        }

        data.stocks[index] = {
            ...data.stocks[index],
            ...req.body,
            id: req.params.id
        };

        await writeJsonFile('stocks.json', data);

        // If this is a default price update, also update user balances
        if (req.body.isDefaultPriceUpdate) {
            const usersData = await readJsonFile('users.json');
            for (const user of usersData.users) {
                // Update user's stock values based on new price
                for (const stock of user.stocks) {
                    if (stock.id === req.params.id) {
                        stock.currentPrice = data.stocks[index].currentPrice;
                    }
                }
            }
            await writeJsonFile('users.json', usersData);
        }

        res.json(data.stocks[index]);
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Error updating stock' });
    }
});

app.delete('/api/stocks/:id', async (req, res) => {
    try {
        const data = await readJsonFile('stocks.json');
        const index = data.stocks.findIndex(s => s.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Stock not found' });
        }
        data.stocks.splice(index, 1);
        await writeJsonFile('stocks.json', data);
        res.json({ message: 'Stock deleted successfully' });
    } catch (error) {
        console.error('Error deleting stock:', error);
        res.status(500).json({ error: 'Error deleting stock' });
    }
});

// Clear all trades and reset stock quantities
app.post('/api/trades/clear', async (req, res) => {
    try {
        // Clear trades
        await writeJsonFile('trades.json', { trades: [] });
        
        // Reset stock quantities to default
        const stocksData = await readJsonFile('stocks.json');
        stocksData.stocks = stocksData.stocks.map(stock => ({
            ...stock,
            shares: stock.totalShares // Reset to original quantity
        }));
        await writeJsonFile('stocks.json', stocksData);
        
        // Reset user balances and stocks
        const usersData = await readJsonFile('users.json');
        usersData.users = usersData.users.map(user => ({
            ...user,
            balance: user.initialBalance || 0, // Reset to initial balance
            stocks: [] // Clear user's stocks
        }));
        await writeJsonFile('users.json', usersData);
        
        res.json({ message: 'All trades cleared and data reset successfully' });
    } catch (error) {
        console.error('Error clearing trades:', error);
        res.status(500).json({ error: 'Error clearing trades' });
    }
});

// Set default balance for users
app.post('/api/users/default-balance', async (req, res) => {
    try {
        const balance = parseFloat(req.body.balance);
        if (isNaN(balance)) {
            return res.status(400).json({ error: 'Invalid balance value' });
        }

        const data = await readJsonFile('users.json');
        for (let user of data.users) {
            user.balance = balance;
        }
        await writeJsonFile('users.json', data);
        res.json({ message: 'Default balance set successfully' });
    } catch (error) {
        console.error('Error setting default balance:', error);
        res.status(500).json({ error: 'Error setting default balance' });
    }
});

// Start server with Socket.IO
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the API at http://YOUR_IP:${PORT}`);
});
