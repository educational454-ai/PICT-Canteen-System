const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Faculty = require('../models/Faculty');
const Guest = require('../models/Guest');

router.post('/place', async (req, res) => {
    try {
        const { voucherCode, items, totalAmount } = req.body;
        
        // ==========================================
        // SECURITY CHECK 1: CATEGORY LIMITS FOR TODAY
        // ==========================================
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); 
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); 

        // Fetch ALL orders placed by this voucher today
        const todaysOrders = await Order.find({
            voucherCode: voucherCode,
            orderDate: { $gte: startOfDay, $lte: endOfDay }
        });

        // Build a list of categories they already ate today
        const consumedCategories = new Set();
        todaysOrders.forEach(order => {
            order.items.forEach(item => {
                if (item.category) consumedCategories.add(item.category);
            });
        });

        // Check if the current cart has categories they already ate
        for (let currentItem of items) {
            if (consumedCategories.has(currentItem.category)) {
                return res.status(400).json({ 
                    error: `Limit Exceeded: You have already ordered an item from the '${currentItem.category}' category today.` 
                });
            }
        }

        // ==========================================
        // SECURITY CHECK 2: VALIDATE VOUCHER
        // ==========================================
        let targetFacultyId;
        let targetDepartmentId;
        let validFrom, validTill, isActive;

        const faculty = await Faculty.findOne({ voucherCode: voucherCode });
        if (faculty) {
            targetFacultyId = faculty._id;
            targetDepartmentId = faculty.departmentId;
            validFrom = new Date(faculty.validFrom);
            validTill = new Date(faculty.validTill);
            isActive = faculty.isActive;
        } else {
            const guest = await Guest.findOne({ voucherCode: voucherCode });
            if (!guest) return res.status(404).json({ error: "Invalid voucher code" });
            
            targetFacultyId = guest.facultyId;
            targetDepartmentId = guest.departmentId;
            validFrom = new Date(guest.validFrom);
            validTill = new Date(guest.validTill);
            isActive = guest.isActive;
        }

        validTill.setHours(23, 59, 59, 999);
        const now = new Date();

        if (!isActive || now < validFrom || now > validTill) {
            return res.status(400).json({ error: "Access Denied: Your voucher is expired or inactive." });
        }

        // ==========================================
        // CREATE ORDER IF ALL CHECKS PASS
        // ==========================================
        const newOrder = new Order({
            facultyId: targetFacultyId,
            departmentId: targetDepartmentId,
            voucherCode: voucherCode, 
            items: items, // Now includes the category from the frontend
            totalAmount: totalAmount
        });

        await newOrder.save();
        res.status(201).json({ message: "Order placed successfully" });

    } catch (error) {
        console.error("Order Placement Error:", error);
        res.status(500).json({ error: "Failed to place order" });
    }
});

// Fetch orders for a specific department's report 
router.get('/department/:deptId', async (req, res) => {
    try {
        const orders = await Order.find({ departmentId: req.params.deptId })
            .populate('facultyId', 'fullName voucherCode')
            .sort({ orderDate: -1 }); 
            
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch department orders" });
    }
});

// GET ALL Orders (For Canteen Manager / Admin)
router.get('/all', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('facultyId', 'fullName voucherCode') 
            .populate('departmentId', 'name') // Note: Using 'name' for department as fixed earlier
            .sort({ createdAt: -1 }); 
            
        res.status(200).json(orders);
    } catch (error) {
        console.error("🚨 BACKEND CRASH in /orders/all:", error);
        res.status(500).json({ error: "Failed to fetch all orders", details: error.message });
    }
});

module.exports = router;