const axios = require('axios');
const { apiKey } = require('../../config');
const Database = require('../../db');

class Order {
  static async addItemToOrder(req, res) {
    try {
      const { user_id, product } = req.body;

      if (!(user_id && product)) {
        res.json({ error: 'Incorret data' }).status(400);
        throw new Error('Invalid input data');
      }

      const response = await Database.addItemToOrder(user_id, product);
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

  static async getDeliveryCost(req, res) {
    try {
      const { id, from, to } = req.body;

      if (!(id && from && to)) throw new Error('Incorrect input data');

      const [fromRes, toRes] = await Promise.all([
        axios.post('https://api.novaposhta.ua/v2.0/json/', {
          apiKey,
          modelName: 'Address',
          calledMethod: 'searchSettlements',
          methodProperties: {
            CityName: from,
            Limit: 1,
          },
        }),
        axios.post('https://api.novaposhta.ua/v2.0/json/', {
          apiKey,
          modelName: 'Address',
          calledMethod: 'searchSettlements',
          methodProperties: {
            CityName: to,
            Limit: 1,
          },
        }),
      ]);

      if (!(fromRes.data.success && toRes.data.success)) throw new Error('Incorrect cities names');

      const fromId = fromRes.data.data[0].Addresses[0].Ref;
      const toId = toRes.data.data[0].Addresses[0].Ref;

      const products = await Database.getProductsFromOrder(id);

      const params = { totalPrice: 0, totalWeight: 0 };

      products.forEach((prod) => {
        params.totalPrice += +prod.price * prod.quantity;
        params.totalWeight += 10 * prod.quantity;
      });

      const costRes = await axios.post('https://api.novaposhta.ua/v2.0/json/', {
        modelName: 'InternetDocument',
        calledMethod: 'getDocumentPrice',
        methodProperties: {
          CitySender: fromId,
          CityRecipient: toId,
          Weight: params.totalWeight,
          ServiceType: 'DoorsDoors',
          Cost: params.totalPrice,
          CargoType: 'Cargo',
          SeatsAmount: 1,
        },
        apiKey,
      });

      res.json({ deliveryCost: costRes.data.data[0].Cost });
    } catch (error) {
      console.log(error);
      res.json({ error: error.message }).status(400);
      throw error;
    }
  }
}

module.exports = Order;
