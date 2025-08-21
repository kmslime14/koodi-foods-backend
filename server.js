// server.js - Updated with database
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.log('❌ MongoDB connection error:', err));

// Simple User model
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  joinDate: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Simple Order model
const orderSchema = new mongoose.Schema({
  customerName: String,
  customerPhone: String,
  items: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  total: Number,
  status: { type: String, default: 'placed' },
  orderTime: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Koodi Foods API is running!',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Get all users (for admin panel)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Don't send passwords
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (for admin panel)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderTime: -1 }); // Newest first
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new user (for mobile app registration)
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const user = new User({ name, email, phone, password });
    await user.save();
    
    // Don't send password back
    const userResponse = { ...user.toObject() };
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new order (for mobile app)
app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (for admin panel)
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add some test data
app.get('/api/seed-data', async (req, res) => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Order.deleteMany({});
    
    // Add test users
    const testUsers = [
      { name: 'John Doe', email: 'john@example.com', phone: '+256771234567', password: 'password123' },
      { name: 'Jane Smith', email: 'jane@example.com', phone: '+256782345678', password: 'password123' }
    ];
    
    const users = await User.insertMany(testUsers);
    
    // Add test orders
    const testOrders = [
      {
        customerName: 'John Doe',
        customerPhone: '+256771234567',
        items: [{ name: 'Beef Luwombo', quantity: 2, price: 35000 }],
        total: 70000,
        status: 'delivered'
      },
      {
        customerName: 'Jane Smith',
        customerPhone: '+256782345678',
        items: [{ name: 'Grilled Fish', quantity: 1, price: 38000 }],
        total: 38000,
        status: 'preparing'
      }
    ];
    
    await Order.insertMany(testOrders);
    
    res.json({ message: 'Test data added successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📊 Admin panel can connect to this API');
  console.log('📱 Mobile app can connect to this API');
});