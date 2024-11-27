const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  sellPrice: {
    type: Number,
    required: true
  },
  primaryUnit: {
    type: String
  },
  customUnit: {
    type: String
  },
  type: {
    type: String,
    enum: ['Veg', 'Non-Veg','Beverage'],
    default: 'Veg'
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
    type: Number
  },
  image: {
    type: String, // Add this field to store Cloudinary image URL
    default: '' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
