const pool = require('../config/db');

const getUserProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT id, username, gender_pref, budget_pref, favorite_notes
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Database error while fetching profile' });
  }
};

const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { username, gender_pref, budget_pref, favorite_notes } = req.body;

  try {
    const result = await pool.query(
      `
        UPDATE users
        SET username        = COALESCE($1, username),
            gender_pref     = COALESCE($2, gender_pref),
            budget_pref     = COALESCE($3, budget_pref),
            favorite_notes  = COALESCE($4, favorite_notes)
        WHERE id = $5
        RETURNING id, username, gender_pref, budget_pref, favorite_notes
      `,
      [username || null, gender_pref || null, budget_pref || null, favorite_notes || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error(err.message);
    res.status(500).json({ error: 'Database error while updating profile' });
  }
};

module.exports = { getUserProfile, updateUserProfile };
