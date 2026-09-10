import { pool } from '../config/db.js';

export const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT product_id, product_name, unit_price, units_in_stock, discontinued FROM products WHERE discontinued = 0 ORDER BY product_name ASC'
    );
    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};