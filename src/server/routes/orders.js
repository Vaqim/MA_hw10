const { Router } = require('express');
const asyncHandler = require('express-async-handler');
const { Order } = require('../controllers');

const orders = Router();

orders.post(
  '/create',
  asyncHandler(async (req, res) => {
    try {
      await Order.createOrder(req, res);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }),
);

module.exports = orders;
