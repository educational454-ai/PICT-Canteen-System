const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Faculty = require('../models/Faculty');
const Guest = require('../models/Guest');

router.post('/place', async (req, res) => {
    try {
        const { voucherCode, items, totalAmount } = req.body;
        
        let targetFacultyId;
        let targetDepartmentId;

        // 1. Is this a Faculty Member?
        const faculty = await Faculty.findOne({ voucherCode: voucherCode });
        
        if (faculty) {
            targetFacultyId = faculty._id;
            targetDepartmentId = faculty.departmentId;
        } else {
            // 2. Not a faculty? Check if it's a Guest!
            const guest = await Guest.findOne({ voucherCode: voucherCode });
            if (!guest) return res.status(404).json({ error: "Invalid voucher code" });
            
            // If it's a guest, we bill it to the Faculty who invited them!
            targetFacultyId = guest.facultyId;
            targetDepartmentId = guest.departmentId;
        }

        // 3. Create the order with the EXACT ObjectIds
        const newOrder = new Order({
            facultyId: targetFacultyId,
            departmentId: targetDepartmentId,
            items: items,
            totalAmount: totalAmount
        });

        await newOrder.save();
        res.status(201).json({ message: "Order placed successfully" });

    } catch (error) {
        console.error("Order Placement Error:", error);
        res.status(500).json({ error: "Failed to place order" });
    }
});

// === NEW: Fetch orders for a specific department's report ===
router.get('/department/:deptId', async (req, res) => {
    try {
        // Fetch orders and populate the faculty details to get their names
        const orders = await Order.find({ departmentId: req.params.deptId })
            .populate('facultyId', 'fullName voucherCode')
            .sort({ orderDate: -1 }); // Newest orders first
            
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch department orders" });
    }
});

// GET ALL Orders (For Canteen Manager / Admin)\
router.get('/all', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('facultyId', 'fullName voucherCode') // Safely grab faculty details
            .populate('departmentId', 'Name')          // Safely grab department details
            .sort({ createdAt: -1 }); 
            
        res.status(200).json(orders);
    } catch (error) {
        console.error("🚨 BACKEND CRASH in /orders/all:", error);
        res.status(500).json({ error: "Failed to fetch all orders", details: error.message });
    }
});

module.exports = router;