const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// 상품 목록 조회
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({ isActive: true }).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 단일 상품 조회
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 상품 등록 (관리자 전용)
router.post('/', async (req, res) => {
    try {
        const { name, description, price, category, brand, stock, imageUrl } = req.body;

        const product = new Product({
            name,
            description,
            price,
            category,
            brand,
            stock,
            imageUrl
        });

        const savedProduct = await product.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 상품 수정 (관리자 전용)
router.put('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
        }
        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 상품 삭제 (관리자 전용)
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
        }
        res.json({ message: '상품이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
