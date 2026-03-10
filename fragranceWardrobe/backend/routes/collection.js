const express = require('express');
const router = express.Router();
const { addToCollection, getCollection, removeFromCollection } = require('../controllers/wardrobeController');

router.post('/',                          addToCollection);
router.get('/:userId',                    getCollection);
router.delete('/:userId/item/:collectionId', removeFromCollection);

module.exports = router;
