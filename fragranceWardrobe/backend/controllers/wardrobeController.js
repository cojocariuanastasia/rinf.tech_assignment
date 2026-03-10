const pool = require('../config/db');

const addToCollection = async (req, res) => {
  const { userId, perfumeId, status } = req.body;

  if (!userId || !perfumeId) {
    return res.status(400).json({ error: 'userId and perfumeId are required' });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO user_collection (user_id, perfume_id, status)
        VALUES ($1, $2, COALESCE($3, 'owned'))
        ON CONFLICT (user_id, perfume_id)
        DO UPDATE SET status = EXCLUDED.status
        RETURNING *
      `,
      [userId, perfumeId, status || null]
    );

    res.json({ message: 'Added to collection', entry: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Database error while adding to collection' });
  }
};

const getCollection = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
        SELECT
          uc.id            AS collection_id,
          uc.status        AS collection_status,
          uc.added_at      AS added_at,
          p.*
        FROM user_collection uc
        JOIN perfumes p ON p.id = uc.perfume_id
        WHERE uc.user_id = $1
        ORDER BY uc.added_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Database error while fetching collection' });
  }
};

const removeFromCollection = async (req, res) => {
  const { userId, collectionId } = req.params;

  try {
    const result = await pool.query(
      `
        DELETE FROM user_collection
        WHERE user_id = $1 AND id = $2
        RETURNING *
      `,
      [userId, collectionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Collection item not found' });
    }

    res.json({ message: 'Removed from collection' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Database error while removing from collection' });
  }
};

module.exports = { addToCollection, getCollection, removeFromCollection };
