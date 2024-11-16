require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 5000;
const SECRET_KEY = "hello";

// Middleware
app.use(cors());
app.use(bodyParser.json());
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      req.userId = decoded.id; // Attach userId to the request object
      next();
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  };
  

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Schemas
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});

const GroceryListSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    items: [String],
});

const User = mongoose.model('User', UserSchema);
const GroceryList = mongoose.model('GroceryList', GroceryListSchema);

// Routes
app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });

        // Save the user to the database
        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        // Check if user exists
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        // Generate JWT
        const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });
        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ message: "Error logging in", error });
    }
});

app.post('/save-list', authenticate, async (req, res) => {
    const { items } = req.body; // Array of grocery items
    const userId = req.userId;  // Extracted from JWT by the middleware
  
    try {
      // Update or create a grocery list for the user
      await GroceryList.updateOne(
        { userId },
        { $set: { items } },
        { upsert: true } // Create a new document if none exists
      );
      res.status(200).json({ message: "List saved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error saving list", error });
    }
  });
  
  app.get('/get-list', authenticate, async (req, res) => {
    const userId = req.userId; // Extracted from JWT by the middleware
  
    try {
      const list = await GroceryList.findOne({ userId });
      res.status(200).json(list ? list.items : []);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving list", error });
    }
  });
  
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
