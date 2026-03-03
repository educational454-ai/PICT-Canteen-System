const express = require('express');
const router = express.Router();
const Guest = require('../models/Guest');
const Faculty = require('../models/Faculty');

// Create a new Guest Voucher
router.post('/add', async (req, res) => {
    try {
        const { guestName, facultyVoucher, validFrom, validTill } = req.body;

        // 1. Find the parent Faculty using their voucher
        const faculty = await Faculty.findOne({ voucherCode: facultyVoucher });
        if (!faculty) return res.status(404).json({ error: "Faculty voucher invalid or not found." });

        // 2. Generate Guest Voucher: G-XXXX
        const randomID = Math.floor(1000 + Math.random() * 9000);
        const guestVoucher = `G-${randomID}`;

        const newGuest = new Guest({
            guestName,
            email,
            voucherCode: guestVoucher,
            facultyId: faculty._id,
            departmentId: faculty.departmentId, 
            validFrom,
            validTill,
            isActive: true
        });

        await newGuest.save();
        res.status(201).json({ message: "Guest Voucher Created!", voucher: guestVoucher });

    } catch (error) {
        res.status(400).json({ error: "Failed to create guest", details: error.message });
    }
});

// Fetch all guests for a department
router.get('/department/:deptId', async (req, res) => {
    try {
        const guests = await Guest.find({ departmentId: req.params.deptId })
            .populate('facultyId', 'fullName') // Gets the Host Faculty's name
            .sort({ createdAt: -1 }); 
            
        res.status(200).json(guests);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch department guests" });
    }
});

// Fetch guests created by a specific Faculty Member (Used by Faculty Dashboard)
router.get('/faculty/:voucherCode', async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ voucherCode: req.params.voucherCode });
        if (!faculty) return res.status(404).json({ error: "Faculty not found" });

        const guests = await Guest.find({ facultyId: faculty._id }).sort({ createdAt: -1 });
        res.status(200).json(guests);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch your guests" });
    }
});

module.exports = router;