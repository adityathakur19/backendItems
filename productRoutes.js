const express = require('express');
const router = express.Router();
const Product = require('./Product');
const { validationResult, body } = require('express-validator');

// Validation middleware
const validateProduct = [
    body('itemName').trim().notEmpty().withMessage('Item name is required'),
    body('sellPrice').isFloat({ min: 0 }).withMessage('Sell price must be a positive number'),
    body('type').isIn(['Veg', 'Non-Veg']).withMessage('Invalid product type'),
    body('primaryUnit').optional().isIn(['piece', 'kg', 'gram', '']),
];

// Create product
router.post('/products', validateProduct, async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { 
            itemName, 
            sellPrice, 
            type, 
            primaryUnit, 
            customUnit, 
            gstEnabled 
        } = req.body;

        // Generate barcode (simple random method)
        const barcode = Math.floor(Math.random() * 1000000000000).toString();

        // Calculate GST and total price
        const gstPercentage = gstEnabled ? 5 : 0;
        const gstAmount = gstEnabled ? parseFloat((sellPrice * 0.05).toFixed(2)) : 0;
        const totalPrice = parseFloat((parseFloat(sellPrice) + gstAmount).toFixed(2));

        // Create new product
        const newProduct = new Product({
            itemName,
            sellPrice: parseFloat(sellPrice),
            type,
            primaryUnit,
            customUnit,
            gstEnabled,
            gstPercentage,
            gstAmount,
            totalPrice,
            barcode
        });

        // Save product
        const savedProduct = await newProduct.save();

        res.status(201).json({
            message: 'Product created successfully',
            product: savedProduct
        });
    } catch (error) {
        console.error('Product creation error:', error);
        res.status(400).json({
            error: 'Failed to create product',
            details: error.message
        });
    }
});

// Update product
router.put('/products/:id', validateProduct, async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const productId = req.params.id;
        const { 
            sellPrice, 
            type, 
            primaryUnit, 
            customUnit, 
            gstEnabled 
        } = req.body;

        // Calculate GST and total price
        const gstPercentage = gstEnabled ? 5 : 0;
        const gstAmount = gstEnabled ? parseFloat((sellPrice * 0.05).toFixed(2)) : 0;
        const totalPrice = parseFloat((parseFloat(sellPrice) + gstAmount).toFixed(2));

        // Find the existing product first to ensure it exists
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update product fields
        existingProduct.sellPrice = parseFloat(sellPrice);
        existingProduct.type = type;
        existingProduct.primaryUnit = primaryUnit;
        existingProduct.customUnit = customUnit;
        existingProduct.gstEnabled = gstEnabled;
        existingProduct.gstPercentage = gstPercentage;
        existingProduct.gstAmount = gstAmount;
        existingProduct.totalPrice = totalPrice;

        // Save updated product
        const updatedProduct = await existingProduct.save();

        res.status(200).json({
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('Product update error:', error);
        res.status(400).json({
            error: 'Failed to update product',
            details: error.message
        });
    }
});




// Get all products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve products',
            details: error.message
        });
    }
});

// Delete a product
router.delete('/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        
        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json({ 
            message: 'Product deleted successfully',
            product: deletedProduct 
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to delete product',
            details: error.message
        });
    }
});



module.exports = router;
