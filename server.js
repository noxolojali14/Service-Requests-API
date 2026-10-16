require('dotenv').config();

const express = require('express');
const path = require('path');
const requestRoutes = require('./routes/requestRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3000;

const localDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use((req, res, next) => {
  const origin = req.get('Origin');

  if (origin && localDevelopmentOrigin.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
  }

  return next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', (req, res) => {
  res.json({
    message: 'Service Request Management API',
    requestsUrl: '/api/requests'
  });
});

app.use('/api/requests', requestRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Service Request API is running on port ${port}`);
});