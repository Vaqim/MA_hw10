const { Router } = require('express');
const asyncHandler = require('express-async-handler');
const { Order } = require('../controllers');

const orders = Router();

orders.post(
  '/addItem',
  asyncHandler(async (req, res) => {
    try {
      await Order.addItemToOrder(req, res);
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }),
);

orders.post(
  '/switchStatus',
  asyncHandler(async (req, res) => {
    try {
      await Order.switchStatus(req, res);
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }),

  orders.post(
    '/deliveryCost',
    asyncHandler(async (req, res) => {
      try {
        await Order.getDeliveryCost(req, res);
      } catch (error) {
        console.error(error.message);
        throw error;
      }
    }),
  ),
);

module.exports = orders;
