import { pool } from '../config/db.js';

export const getCustomers = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT customer_id, company_name, contact_name, country FROM customers ORDER BY company_name ASC'
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