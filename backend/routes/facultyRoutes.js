const express = require('express');
const router = express.Router();
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const nodemailer = require('nodemailer');

// --- (Keep your /all and /bulk-add routes exactly the same as before) ---
// Get all faculty for the dashboard
router.get('/all', async (req, res) => {
    try {
        const list = await Faculty.find().sort({ createdAt: -1 });
        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch faculty" });
    }
});

// Bulk add from Excel
router.post('/bulk-add', async (req, res) => {
    try {
        const facultyList = req.body;
        if (!facultyList || facultyList.length === 0) return res.status(400).json({ error: "No data" });

        const dept = await Department.findById(facultyList[0].departmentId);
        let newAdded = 0;
        let extendedCount = 0;

        for (let data of facultyList) {
            // Check if this mobile number already exists in this specific department
            let existingFaculty = await Faculty.findOne({ 
                mobile: data.mobile, 
                departmentId: data.departmentId 
            });

            if (existingFaculty) {
                // FACULTY EXISTS: Extend their voucher validity
                let updated = false;
                const newFrom = new Date(data.validFrom);
                const newTill = new Date(data.validTill);

                if (newFrom < new Date(existingFaculty.validFrom)) {
                    existingFaculty.validFrom = newFrom;
                    updated = true;
                }
                if (newTill > new Date(existingFaculty.validTill)) {
                    existingFaculty.validTill = newTill;
                    updated = true;
                }
                
                // Update Year Scope if changed
                if (existingFaculty.academicYear !== data.academicYear) {
                    existingFaculty.academicYear = data.academicYear;
                    updated = true;
                }

                // IMPORTANT: Reactivate if they were previously soft-deleted
                if (!existingFaculty.isActive) {
                    existingFaculty.isActive = true;
                    updated = true;
                }

                if (updated) {
                    await existingFaculty.save();
                    extendedCount++;
                }
            } else {
                // FACULTY IS NEW: Generate a single new voucher
                const randomID = Math.floor(1000 + Math.random() * 9000);
                const newFaculty = new Faculty({
                    ...data,
                    voucherCode: `PICT-${dept.code}-${randomID}`,
                    isActive: true // Ensure new faculty are active
                });
                await newFaculty.save();
                newAdded++;
            }
        }

        res.status(201).json({ 
            message: "Bulk processing complete", 
            added: newAdded, 
            extended: extendedCount 
        });
    } catch (error) {
        res.status(400).json({ error: "Import failed", details: error.message });
    }
});


// === UPDATED: Get ONLY ACTIVE faculty for a specific department ===
router.get('/department/:deptId', async (req, res) => {
    try {
        // Added { isActive: true } to the filter
        const list = await Faculty.find({ 
            departmentId: req.params.deptId,
            isActive: true 
        }).sort({ createdAt: -1 });
        
        res.status(200).json(list);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch department faculty" });
    }
});

// Configure Nodemailer 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com', 
        pass: 'YOUR_GMAIL_APP_PASSWORD' 
    }
});

// === UPDATED: SOFT DELETE a single Faculty ===
router.delete('/remove/:id', async (req, res) => {
    try {
        // Instead of findByIdAndDelete, we update isActive to false
        await Faculty.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ message: "Faculty removed successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete" });
    }
});

// FEATURE 2: Add Single Faculty Manually (FIXED DATES)
router.post('/add', async (req, res) => {
    try {
        // Now accurately accepting validFrom and validTill from React
        const { fullName, email, mobile, departmentId, academicYear, deptCode, validFrom, validTill } = req.body;
        const randomID = Math.floor(1000 + Math.random() * 9000);
        const voucherCode = `PICT-${deptCode}-${randomID}`;

        const newFaculty = new Faculty({
            fullName, email, mobile, departmentId, academicYear, voucherCode,
            validFrom: validFrom ? new Date(validFrom) : new Date(),
            validTill: validTill ? new Date(validTill) : new Date(new Date().setMonth(new Date().getMonth() + 3)),
            isActive: true 
        });

        await newFaculty.save();
        res.status(201).json(newFaculty);
    } catch (error) {
        res.status(400).json({ error: "Failed to add faculty" });
    }
});

// FEATURE 3: Send Professional Email
router.post('/send-voucher', async (req, res) => {
try {
const { email, fullName, voucherCode, validTill } = req.body;
const mailOptions = {
from: 'PICT Canteen System <YOUR_EMAIL@gmail.com>',
to: email,
subject: 'Confidential: Your PICT Canteen Examination Voucher',
html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
<div style="background-color: #0a1128; padding: 20px; text-align: center;">
<h2 style="color: #60a5fa; margin: 0; font-style: italic;">PICT EXAM PORTAL</h2>
</div>
<div style="padding: 30px; background-color: #ffffff;">
<p>Dear Prof. <strong>${fullName}</strong>,</p>
<p>You have been assigned as an examiner at the Pune Institute of Computer Technology. During your duty, you are provided with complimentary canteen access.</p>
<div style="background-color: #f8f9fc; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
<p style="font-size: 14px; color: #64748b; margin-top: 0; text-transform: uppercase; font-weight: bold;">Your Secure Access Code:</p>
<h1 style="color: #2563eb; font-family: monospace; letter-spacing: 2px; margin: 10px 0;">${voucherCode}</h1>
</div>
<p><strong>Instructions for use:</strong></p>
<ul style="color: #475569; font-size: 14px; line-height: 1.6;">
<li>Present this code at the canteen counter.</li>
<li>This voucher is strictly for personal use and is valid for one order per day.</li>
<li>Validity Period Ends: <strong>${new Date(validTill).toLocaleDateString()}</strong></li>
</ul>
<p style="margin-top: 30px; font-size: 14px; color: #64748b;">Best Regards,<br><strong>Department Coordinator</strong><br>Pune Institute of Computer Technology</p>
</div>
</div>
`
};
await transporter.sendMail(mailOptions);
res.status(200).json({ message: "Email sent successfully!" });
} catch (error) {
console.error("Email Error:", error);
res.status(500).json({ error: "Failed to send email" });
}
});

// === UPDATED: SOFT RESET System (Deactivate all faculty for a department) ===
router.delete('/department/:deptId/reset', async (req, res) => {
    try {
        const { deptId } = req.params;
        
        // Update Many: Set isActive to false instead of deleting them permanently
        const result = await Faculty.updateMany(
            { departmentId: deptId }, 
            { $set: { isActive: false } }
        );

        res.status(200).json({ 
            message: "System reset successfully (Soft Delete)",
            deactivatedCount: result.modifiedCount 
        });
    } catch (error) {
        console.error("Reset Error:", error);
        res.status(500).json({ error: "Failed to reset system" });
    }
});

module.exports = router;