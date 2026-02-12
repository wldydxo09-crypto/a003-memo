const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Login User (로그인)
router.post('/login', userController.loginUser);

// Create User (유저 생성)
router.post('/', userController.createUser);

// Get All Users (모든 유저 조회)
router.get('/', userController.getUsers);

// Get User by ID (특정 유저 조회)
router.get('/:id', userController.getUserById);

// Update User (유저 정보 수정)
router.put('/:id', userController.updateUser);

// Delete User (유저 삭제)
router.delete('/:id', userController.deleteUser);

module.exports = router;
