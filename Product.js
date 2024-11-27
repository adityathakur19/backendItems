const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['Veg', 'Non-Veg'],
        default: 'Veg'
    },
    sellPrice: {
        type: Number,
        required: true,
        min: 0
    },
    gstEnabled: {
        type: Boolean,
        default: false
    },
    gstPercentage: {
        type: Number,
        default: 0
    },
    gstAmount: {
        type: Number,
        default: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    primaryUnit: {
        type: String,
        enum: ['piece', 'kg', 'gram', '']
    },
    customUnit: {
        type: String,
        trim: true
    },
    barcode: {
        type: String,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Product', ProductSchema);