const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
   
    voucherCode: { type: String, required: true },

    items: [
        {
            itemName: String,
            category: String, 
            quantity: Number,
            price: Number
        }
    ],
    totalAmount: { type: Number, required: true },
    
    // 🚀 NEW: Added the status field to track the kitchen progress!
    status: { 
        type: String, 
        enum: ['Pending', 'Preparing', 'Ready', 'Completed'], 
        default: 'Pending' 
    },

    orderDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);