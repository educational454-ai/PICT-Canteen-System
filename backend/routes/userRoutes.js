const express = require('express');
const router = express.Router();
const User = require('../models/User'); 

// Route: Create a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const newUser = new User({
            name: name,
            email: email,
            password: password, 
            role: role
        });
        await newUser.save();
        res.status(201).json({ message: "User created successfully!", user: newUser });
    } catch (error) {
        res.status(400).json({ error: "Failed to create user", details: error.message });
    }
});

// Route: Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt for: ${email}`); 

        const user = await User.findOne({ email }).populate('departmentId');
        
        if (!user) {
            console.log("Error: User not found in database.");
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (user.password !== password) {
            console.log("Error: Password does not match.");
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // 🚀 THE FIX 1: Allow SUPER_ADMIN to bypass the department check!
        if (!user.departmentId && user.role !== 'SUPER_ADMIN') {
            console.log("Error: User exists, but departmentId is missing or invalid!");
            return res.status(500).json({ error: "User is not assigned to a valid department." });
        }

        console.log("Login successful! Sending data to frontend.");
        res.status(200).json({
            user: {
                name: user.name,
                role: user.role,
                // 🚀 THE FIX 2: Safely handle missing department using optional chaining (?.)
                deptId: user.departmentId?._id || null, 
                deptCode: user.departmentId?.code || 'GLOBAL',
                deptName: user.departmentId?.name || 'Global Administration'
            }
        });
    } catch (error) {
        console.error("Server error during login:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

module.exports = router;