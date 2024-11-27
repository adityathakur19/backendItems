const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { validationResult, body } = require('express-validator');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB file size limit
    },
    fileFilter: (req, file, cb) => {
        // Accept image files only
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Validation middleware
const validateProduct = [
    body('itemName').trim().notEmpty().withMessage('Item name is required'),
    body('sellPrice').isFloat({ min: 0 }).withMessage('Sell price must be a positive number'),
    body('type').isIn(['Veg', 'Non-Veg']).withMessage('Invalid product type'),
    body('primaryUnit').optional().isIn(['piece', 'kg', 'gram', '']),
];

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (file) => {
    if (!file) return null;

    try {
        // Convert buffer to base64
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = "data:" + file.mimetype + ";base64," + b64;

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
            folder: "products", // Organize images in a folder
            resource_type: "auto",
            // Optional: Add transformations
            transformation: [
                { width: 500, height: 500, crop: "limit" }
            ]
        });

        return uploadResponse.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Image upload failed');
    }
};

// Create product route
router.post('/products', upload.single('image'), validateProduct, async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Upload image to Cloudinary if exists
        const imageUrl = await uploadToCloudinary(req.file);

        const { 
            itemName, 
            sellPrice, 
            type, 
            primaryUnit, 
            customUnit, 
            gstEnabled 
        } = req.body;

        // Calculate GST details
        const gstPercentage = gstEnabled === 'true' ? 5 : 0;
        const sellPriceFloat = parseFloat(sellPrice);
        const gstAmount = gstEnabled === 'true' 
            ? parseFloat((sellPriceFloat * 0.05).toFixed(2)) 
            : 0;
        const totalPrice = parseFloat((sellPriceFloat + gstAmount).toFixed(2));

        // Generate barcode (simple random method)
        const barcode = Math.floor(Math.random() * 1000000000000).toString();

        // Create new product
        const newProduct = new Product({
            itemName,
            sellPrice: sellPriceFloat,
            type,
            primaryUnit,
            customUnit,
            gstEnabled: gstEnabled === 'true',
            gstPercentage,
            gstAmount,
            totalPrice,
            barcode,
            image: imageUrl // Store Cloudinary URL
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

// Update product route
router.put('/products/:id', upload.single('image'), validateProduct, async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const productId = req.params.id;

        // Find existing product
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Upload new image if provided
        let imageUrl = existingProduct.image;
        if (req.file) {
            // If existing image, delete from Cloudinary first
            if (existingProduct.image) {
                try {
                    // Extract public ID from existing image URL
                    const publicId = existingProduct.image.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(`products/${publicId}`);
                } catch (deleteError) {
                    console.warn('Failed to delete old image:', deleteError);
                }
            }

            // Upload new image
            imageUrl = await uploadToCloudinary(req.file);
        }

        const { 
            sellPrice, 
            type, 
            primaryUnit, 
            customUnit, 
            gstEnabled 
        } = req.body;

        // Calculate GST details
        const gstPercentage = gstEnabled === 'true' ? 5 : 0;
        const sellPriceFloat = parseFloat(sellPrice);
        const gstAmount = gstEnabled === 'true' 
            ? parseFloat((sellPriceFloat * 0.05).toFixed(2)) 
            : 0;
        const totalPrice = parseFloat((sellPriceFloat + gstAmount).toFixed(2));

        // Update product fields
        existingProduct.sellPrice = sellPriceFloat;
        existingProduct.type = type;
        existingProduct.primaryUnit = primaryUnit;
        existingProduct.customUnit = customUnit;
        existingProduct.gstEnabled = gstEnabled === 'true';
        existingProduct.gstPercentage = gstPercentage;
        existingProduct.gstAmount = gstAmount;
        existingProduct.totalPrice = totalPrice;
        existingProduct.image = imageUrl;

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

// Delete product route with image cleanup
router.delete('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;

        // Find the product to get the image URL
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Delete image from Cloudinary if exists
        if (product.image) {
            try {
                // Extract public ID from image URL
                const publicId = product.image.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`products/${publicId}`);
            } catch (deleteError) {
                console.warn('Failed to delete image from Cloudinary:', deleteError);
            }
        }

        // Delete product from database
        const deletedProduct = await Product.findByIdAndDelete(productId);

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

module.exports = router;
