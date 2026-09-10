import { pool } from '../config/db.js';

export const createOrder = async (req, res, next) => {
  const { customer_id, employee_id, ship_address, items } = req.body;

  if (!customer_id || !employee_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      status: 400,
      error: 'Se requiere customer_id, employee_id y un arreglo items no vacío.'
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validar cliente
    const customerRes = await client.query(
      'SELECT customer_id FROM customers WHERE customer_id = $1',
      [customer_id]
    );
    if (customerRes.rowCount === 0) {
      const err = new Error(`El cliente con ID "${customer_id}" no existe.`);
      err.statusCode = 404;
      throw err;
    }

    // 2. Validar empleado
    const employeeRes = await client.query(
      'SELECT employee_id FROM employees WHERE employee_id = $1',
      [employee_id]
    );
    if (employeeRes.rowCount === 0) {
      const err = new Error(`El empleado con ID ${employee_id} no existe.`);
      err.statusCode = 404;
      throw err;
    }

    // 3. Validar productos y stock
    const validatedItems = [];
    for (const item of items) {
      const { product_id, quantity, discount = 0 } = item;

      if (!product_id || !quantity || quantity <= 0) {
        const err = new Error('Cada producto debe contener product_id válido y quantity mayor a 0.');
        err.statusCode = 400;
        throw err;
      }

      const prodRes = await client.query(
        'SELECT product_id, unit_price, units_in_stock FROM products WHERE product_id = $1',
        [product_id]
      );

      if (prodRes.rowCount === 0) {
        const err = new Error(`El producto con ID ${product_id} no existe.`);
        err.statusCode = 404;
        throw err;
      }

      const product = prodRes.rows[0];
      if (product.units_in_stock < quantity) {
        const err = new Error(
          `Stock insuficiente para el producto ID ${product_id}. Disponible: ${product.units_in_stock}, solicitado: ${quantity}`
        );
        err.statusCode = 400;
        throw err;
      }

      validatedItems.push({
        product_id,
        unit_price: product.unit_price,
        quantity,
        discount
      });
    }

    // 4. Obtener el siguiente ID consecutivo para order_id
    const maxIdRes = await client.query('SELECT COALESCE(MAX(order_id), 10247) + 1 AS next_id FROM orders');
    const newOrderId = maxIdRes.rows[0].next_id;

    // 5. Insertar la orden con el order_id calculado
    const orderInsertRes = await client.query(
      `INSERT INTO orders (order_id, customer_id, employee_id, order_date, ship_address)
       VALUES ($1, $2, $3, CURRENT_DATE, $4)
       RETURNING order_id, order_date`,
      [newOrderId, customer_id, employee_id, ship_address || null]
    );

    // 6. Insertar items y descontar stock
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_details (order_id, product_id, unit_price, quantity, discount)
         VALUES ($1, $2, $3, $4, $5)`,
        [newOrderId, item.product_id, item.unit_price, item.quantity, item.discount]
      );

      await client.query(
        `UPDATE products 
         SET units_in_stock = units_in_stock - $1 
         WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      status: 201,
      message: 'Orden creada exitosamente.',
      data: {
        order_id: newOrderId,
        order_date: orderInsertRes.rows[0].order_date,
        items_count: validatedItems.length
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getOrderById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const orderRes = await pool.query(
      `SELECT o.order_id, o.order_date, o.customer_id, c.company_name, 
              o.employee_id, e.first_name || ' ' || e.last_name AS employee_name,
              o.ship_address
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       JOIN employees e ON o.employee_id = e.employee_id
       WHERE o.order_id = $1`,
      [id]
    );

    if (orderRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        status: 404,
        error: `Orden ${id} no encontrada.`
      });
    }

    const detailsRes = await pool.query(
      `SELECT od.product_id, p.product_name, od.unit_price, od.quantity, od.discount,
              ROUND((od.unit_price * od.quantity * (1 - od.discount))::numeric, 2) AS subtotal
       FROM order_details od
       JOIN products p ON od.product_id = p.product_id
       WHERE od.order_id = $1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      status: 200,
      data: {
        ...orderRes.rows[0],
        details: detailsRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};