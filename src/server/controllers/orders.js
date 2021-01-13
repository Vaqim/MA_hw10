const Database = require('../../db');

class Order {
  static async createOrder(req, res) {
    try {
      const { user_id, product } = req.body;

      if (!(user_id && product)) {
        res.json({ error: 'Incorret data' }).status(400);
        throw new Error('Invalid input data');
      }

      const response = await Database.createOrder(user_id, product);
      res.json(response);

      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

module.exports = Order;
