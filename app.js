require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { errorHandler } = require('./middleware/errorHandler');
const categoryRoutes = require('./routes/categoryRoutes');
const todoRoutes = require('./routes/todoRoutes');
const authRoutes = require('./routes/authRoutes');
const { swaggerUi, swaggerSpec } = require('./swagger');
const logger = require('./middleware/logger');

const app = express();

// --- Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/todos', todoRoutes);

// --- Test route for error handler
app.get('/error-test', (req, res) => {
  throw new Error('Тестовая ошибка!');
});

// --- 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' });
});

// --- Error handler
app.use(errorHandler);

// --- Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
