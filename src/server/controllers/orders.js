const axios = require('axios');
const { apiKey, apiOrigin } = require('../../config');
const Database = require('../../db');

class Order {
  static async addItemToOrder(req, res) {
    try {
      const { user_id: userId, product: productToOrder } = req.body;
      productToOrder.quantity = productToOrder.quantity || 1;

      if (!(userId && productToOrder.price && productToOrder.type && productToOrder.color)) {
        res.json({ error: 'Incorret data' }).status(400);
        throw new Error('Invalid input data');
      }

      const [currentOrderId, productInStock] = await Promise.all([
        Database.getOrCreateOrder(userId),
        Database.getProductParams(productToOrder),
      ]);

      await Database.addProductToOrder(productInStock, productToOrder, currentOrderId);

      const itemsList = await Database.getOrderItems(currentOrderId);

      res.json(itemsList);
    } catch (error) {
      console.error(error);
      res.json({ error: error.message }).status(400);
      throw error;
    }
  }

  static async switchStatus(req, res) {
    try {
      const { id, status } = req.body;

      if (!(id && status)) throw new Error('Incorrect input data :(');

      const currentStatus = await Database.getOrderStatus(id);
      let order;

      if (currentStatus === status) throw new Error(`Status is already ${status}`);

      switch (status) {
        case 'pending':
          [[order]] = await Promise.all([
            Database.switchStatus(id, status),
            Database.cleanOrder(id),
          ]);
          break;
        case 'confirmed':
          if (currentStatus === 'cancelled') throw new Error('Order is cancelled!');
          [order] = await Database.switchStatus(id, status);
          break;
        case 'cancelled':
          if (currentStatus === 'confirmed') throw new Error('Order is confirmed!');
          [[order]] = await Promise.all([
            Database.switchStatus(id, status),
            Database.returnProductsToStock(id),
          ]);
          break;
        default:
          throw new Error('Unknown status');
      }

      res.json(order);
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
        axios.post(apiOrigin, {
          apiKey,
          modelName: 'Address',
          calledMethod: 'searchSettlements',
          methodProperties: {
            CityName: from,
            Limit: 1,
          },
        }),
        axios.post(apiOrigin, {
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

      const [products] = await Database.getProductsFromOrder(id);

      const costRes = await axios.post(apiOrigin, {
        modelName: 'InternetDocument',
        calledMethod: 'getDocumentPrice',
        methodProperties: {
          CitySender: fromId,
          CityRecipient: toId,
          Weight: +products.totalWeight,
          ServiceType: 'DoorsDoors',
          Cost: +products.totalPrice,
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
