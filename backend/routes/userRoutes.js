const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Bring in the blueprint we just made!

// Route: Create a new user
// Method: POST (used for sending data)
router.post('/register', async (req, res) => {
    try {
        // 1. Grab the data sent from the frontend/Thunder Client
        const { name, email, password, role } = req.body;

        // 2. Create a new User using our Mongoose model
        const newUser = new User({
            name: name,
            email: email,
            password: password, 
            role: role
        });

        // 3. Save it to the MongoDB database!
        await newUser.save();

        // 4. Send a success message back
        res.status(201).json({ message: "User created successfully!", user: newUser });

    } catch (error) {
        // If something goes wrong (like a missing email), send an error
        res.status(400).json({ error: "Failed to create user", details: error.message });
    }
});

// Add/Update the login route in userRoutes.js
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt for: ${email}`); // DEBUG PRINT

        // Find user and populate department details
        const user = await User.findOne({ email }).populate('departmentId');
        
        if (!user) {
            console.log("Error: User not found in database.");
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (user.password !== password) {
            console.log("Error: Password does not match.");
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // SAFETY CHECK: Ensure the department actually linked!
        if (!user.departmentId) {
            console.log("Error: User exists, but departmentId is missing or invalid!");
            return res.status(500).json({ error: "User is not assigned to a valid department." });
        }

        console.log("Login successful! Sending data to frontend.");
        res.status(200).json({
            user: {
                name: user.name,
                role: user.role,
                deptId: user.departmentId._id,
                deptCode: user.departmentId.code,
                deptName: user.departmentId.name
            }
        });
    } catch (error) {
        console.error("Server error during login:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// Export the router so server.js can use it
module.exports = router;