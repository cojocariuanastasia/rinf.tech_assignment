const pool = require('../config/db');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
  const { username, password, gender_pref, budget_pref, favorite_notes } = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash, gender_pref, budget_pref, favorite_notes) VALUES ($1, $2, $3, $4, $5) RETURNING id, username',
      [username, hashedPassword, gender_pref, budget_pref, favorite_notes]
    );

    res.json({ message: 'Welcome to the Wardrobe!', user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'User already exists or database error' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (user.rows.length === 0) return res.status(400).json({ error: 'Invalid Credentials' });

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid Credentials' });

    res.json({ message: 'Logged in!', userId: user.rows[0].id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = { register, login };
