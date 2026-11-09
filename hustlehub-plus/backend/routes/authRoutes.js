const express = require('express');
// used to create a new express router 
const router = express.Router();
// used to import the aunthentication controller function 
const { register, login, profile } = require('../controllers/authController');
// used to import the authentication and authorization middleware 
const { authenticateToken } = require('../middleware/authMiddleware');
// used to import the validation middleware 
const { registerValidationRules, loginValidationRules, validate } = require('../middleware/validators');

router.post('/register', registerValidationRules, validate, register);
router.post('/login', loginValidationRules, validate, login);
router.get('/profile', authenticateToken, profile);

module.exports = router;