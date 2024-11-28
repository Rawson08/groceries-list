require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY;

// Define allowed origins
const corsOptions = {
  origin: ['https://roshansubedi.me', 'http://127.0.0.1:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
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

// Schemas
const groceryListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true }, // MAB user ID
  items: [{ type: String }],
});
const GroceryList = mongoose.model('GroceryList', groceryListSchema);
  
// Routes
app.post("/save-list", authenticate, async (req, res) => {
    const { items } = req.body;
  
    try {
      // Filter duplicates
      const uniqueItems = [...new Set(items.map((item) => item.trim().toLowerCase()))];
      const list = await GroceryList.findOneAndUpdate(
        { userId: req.userId },
        { items: uniqueItems },
        { new: true, upsert: true }
      );
  
      res.status(200).json({ message: "List saved successfully", list });
    } catch (error) {
      console.error("Error saving list:", error);
      res.status(500).json({ message: "Error saving list", error });
    }
  });
  
  
  
  app.get("/get-list/:userId", authenticate, async (req, res) => { 
    try {
      const list = await GroceryList.findOne({ userId:req.userId });
  
      res.status(200).json(list || { items: [] });
    } catch (error) {
      console.error("Error retrieving list:", error);
      res.status(500).json({ message: "Error retrieving list", error });
    }
  });
  
  app.post("/remove-item", authenticate, async (req, res) => {
    const {  item } = req.body;

    try {
      await GroceryList.updateOne(
        { userId: req.userId },
        { $pull: { items: item } }
      );
      res.status(200).json({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Error removing item from database:", error);
      res.status(500).json({ message: "Error removing item", error });
    }
  });


  app.delete("/delete-user-data", authenticate, async (req, res) => {
    try {
      const userId = req.userId;
  
      await GroceryList.deleteOne({ userId }); // Delete grocery list associated with user
      res.status(200).json({ message: "User data deleted successfully." });
    } catch (error) {
      console.error("Error deleting user data:", error);
      res.status(500).json({ message: "Error deleting user data." });
    }
  });

  
app.listen(PORT, () => console.log(`GLM Server running on port ${PORT}`));
