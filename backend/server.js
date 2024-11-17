require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 5000;
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
const User = mongoose.model('User', UserSchema);

const groceryListSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
    items: [{ type: String }], // Array of grocery items
  });
    const GroceryList = mongoose.model("GroceryList", groceryListSchema);
  
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


app.post("/save-list", async (req, res) => {
    const { userId, items } = req.body;
  
    // if (!userId || !items) {
    //   return res.status(400).json({ message: "User ID and items are required" });
    // }
  
    try {
      // Filter duplicates
      const uniqueItems = [...new Set(items.map((item) => item.trim()))];
  
      const list = await GroceryList.findOneAndUpdate(
        { userId },
        { items: uniqueItems },
        { new: true, upsert: true }
      );
  
      res.status(200).json({ message: "List saved successfully", list });
    } catch (error) {
      console.error("Error saving list:", error);
      res.status(500).json({ message: "Error saving list", error });
    }
  });
  
  
  
  app.get("/get-list/:userId", async (req, res) => {
    const { userId } = req.params;
  
    try {
      const list = await GroceryList.findOne({ userId });
  
      if (!list) {
        return res.status(404).json({ message: "List not found" });
      }
  
      res.status(200).json(list);
    } catch (error) {
      console.error("Error retrieving list:", error);
      res.status(500).json({ message: "Error retrieving list", error });
    }
  });
  
  app.post("/remove-item", async (req, res) => {
    const { userId, item } = req.body;
  
    console.log("Request to remove item:", item, "for user:", userId); // Debugging
  
    if (!userId || !item) {
      return res.status(400).json({ message: "User ID and item are required" });
    }
  
    try {
      await GroceryList.updateOne(
        { userId },
        { $pull: { items: item } } // `$pull` removes the item from the array
      );
      console.log("Item removed successfully from database"); // Debugging
      res.status(200).json({ message: "Item removed successfully" });
    } catch (error) {
      console.error("Error removing item from database:", error);
      res.status(500).json({ message: "Error removing item", error });
    }
  });
  
  
  

  app.get("/user-info", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  
    try {
      const decoded = jwt.verify(token, SECRET_KEY); // Decode the token
      const user = await User.findById(decoded.id); // Fetch the user from the database
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json({ userId: user._id, username: user.username }); // Include username
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  });
  
  app.post("/logout", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(400).json({ message: "No token provided" });
    }
  
    // Blacklist the token or implement session invalidation logic here (if needed)
    // For example:
    // tokenBlacklist.add(token);
  
    res.status(200).json({ message: "Logout successful" });
  });
  
  
  
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
