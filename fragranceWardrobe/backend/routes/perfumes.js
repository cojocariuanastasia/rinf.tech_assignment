const express = require('express');
const router = express.Router();
const { searchPerfumes, getPerfumeById, getAiSuggestions } = require('../controllers/perfumeController');

router.get('/search',          searchPerfumes);
router.get('/:id/ai-suggestions', getAiSuggestions);
router.get('/:id',             getPerfumeById);

module.exports = router;
