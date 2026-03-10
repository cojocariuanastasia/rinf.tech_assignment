const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/perfumes', require('./routes/perfumes'));
app.use('/api/collection', require('./routes/collection'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ai', require('./routes/ai'));

app.get('/', (req, res) => {
  res.send('Fragrance API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
