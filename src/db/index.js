const Knex = require('knex');
const { db: dbConfig } = require('../config');

const client = new Knex(dbConfig);

class Database {
  static async testConnection() {
    try {
      await client.raw('select now()');
      console.log('DB connection done!');
    } catch (error) {
      console.log(`Test connection failed: ${error.message || error}`);
      throw error;
    }
  }

  // /order/addItem

  static async getOrCreateOrder(userId) {
    try {
      if (!userId) throw new Error('ERROR: argument "userId : uuid" wasn`t defined!');

      const [currentOrderId] = await client('orders')
        .insert(
          {
            user_id: userId,
          },
          'id',
        )
        .onConflict('user_id')
        .merge();

      return currentOrderId;
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }

  static async getProductParams({ color, type, price }) {
    try {
      if (!(color && type && price))
        throw new Error('ERROR: arguments "color, type, price" required!');

      const getPropId = (prop, value) => client(`${prop}s`).select('id').where('name', value);

      const [productInStock] = await client('products')
        .select(['id', 'quantity'])
        .where({
          type_id: getPropId('type', type),
          color_id: getPropId('color', color),
          price,
        })
        .whereNull('deleted_at');

      if (!productInStock) throw new Error('Product wasn`t defined');

      return productInStock;
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }

  static async addProductToOrder(productInStock, productToOrder, orderId) {
    try {
      if (productToOrder.quantity > productInStock.quantity)
        throw new Error(
          `There isn\`t so many goods in stock, ${productInStock.quantity} available`,
        );
      await client.transaction(async (trx) => {
        await trx('products')
          .decrement({
            quantity: productToOrder.quantity,
          })
          .where('id', productInStock.id);

        const insertItem = trx('order_item').insert({
          order_id: orderId,
          product_id: productInStock.id,
          quantity: productToOrder.quantity,
        });

        const updateQuantity = trx.queryBuilder().update({
          quantity: trx.raw('order_item.quantity + ?', [productToOrder.quantity]),
        });

        await trx.raw(
          `${insertItem} ON CONFLICT ON CONSTRAINT uniq_order_item DO ${updateQuantity}`,
        );
      });
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  static async getOrderItems(orderId) {
    try {
      const itemsList = await client('order_item')
        .select({
          type: client.raw('(select name from types where id = products.type_id)'),
          color: client.raw('(select name from colors where id = products.color_id)'),
          price: 'products.price',
          quantity: 'order_item.quantity',
        })
        .from('order_item')
        .innerJoin('products', 'order_item.product_id', 'products.id')
        .where('order_item.order_id', orderId);

      return itemsList;
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  // /order/switchStatus

  static async getOrderStatus(id) {
    try {
      const [{ status }] = await client('orders').select('status').where('id', id);

      return status;
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  static async switchStatus(orderId, status) {
    try {
      const newOrder = await client('orders')
        .update(
          {
            status,
          },
          ['*'],
        )
        .where('id', orderId);

      return newOrder;
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  static async cleanOrder(orderId) {
    try {
      await client('order_item').del().where('order_id', orderId);
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  static async returnProductsToStock(orderId) {
    try {
      await client.transaction(async (trx) => {
        const products = await trx('order_item')
          .select('product_id', 'quantity')
          .where('order_id', orderId);

        products.forEach(async (prod) => {
          await trx('products').increment('quantity', prod.quantity).where('id', prod.product_id);
        });

        await this.cleanOrder(orderId);
      });
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  // /order/deliveryCost

  static async getProductsFromOrder(orderId) {
    try {
      const res = await client('order_item')
        .select({
          totalPrice: client.raw('SUM(products.price * order_item.quantity)'),
          totalWeight: client.raw('SUM(products.weight * order_item.quantity)'),
        })
        .where('order_id', orderId)
        .innerJoin('products', 'order_item.product_id', 'products.id');
      return res;
    } catch (error) {
      console.error(`ERROR: ${error.message || error}`);
      throw error;
    }
  }
}

module.exports = Database;
