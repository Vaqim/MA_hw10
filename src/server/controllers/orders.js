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
      res.json({ error: error.message }).status(400);
      throw error;
    }
  }

  static async switchStatus(req, res) {
    try {
      const { id, status } = req.body;
      const response = await Database.switchStatus(id, status);
      res.json(response);
    } catch (error) {
      console.log(error);
      res.json({ error: error.message }).status(400);
      throw error;
    }
  }
}

module.exports = Order;
