const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
   
    //We must save the voucher code to track daily limits!
    voucherCode: { type: String, required: true },

    items: [
        {
            itemName: String,
            category: String, //Tracking the category
            quantity: Number,
            price: Number
        }
    ],
    totalAmount: { type: Number, required: true },
    orderDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);