import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import customerRoutes from './routes/customer.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Endpoints base
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API REST Northwind operativa.' });
});

// Rutas de la API
app.use('/customers', customerRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

// Manejo de recursos inexistentes (404)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    status: 404,
    error: `Ruta ${req.originalUrl} no encontrada en el servidor.`,
  });
});

// Middleware centralizado de errores
app.use(errorHandler);

export default app;