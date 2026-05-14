const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { evaluateNLPAccuracy } = require('../services/nlpEvaluator');

router.get('/ping', (req, res) => {
  res.json({ ok: true, message: 'pong' });
});

router.get('/auth-check', authenticate, (req, res) => {
  res.json({ ok: true, user: req.user });
});

router.get('/nlp-accuracy', authenticate, async (req, res, next) => {
  try {
    const results = await evaluateNLPAccuracy();
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
