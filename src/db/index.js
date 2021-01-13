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

  static async createOrder(userId, product) {
    try {
      if (!userId) throw new Error('user id wasn`t defined');
      if (!(product.color && product.type && product.price))
        throw new Error('incorrect input data');

      let [currentOrder] = await client('orders').select('*').where('user_id', userId);

      if (!currentOrder) {
        [currentOrder] = await client('orders')
          .insert({
            user_id: userId,
          })
          .returning('*');
      }

      const getPropId = (prop, value) => client(`${prop}s`).select('id').where('name', value);

      product.quantity = product.quantity || 1;

      const [productInStock] = await client('products')
        .select('*')
        .where({
          type_id: getPropId('type', product.type),
          color_id: getPropId('color', product.color),
          price: product.price,
        });

      if (!productInStock) throw new Error('Product wasn`t defined');
      if (product.quantity > productInStock.quantity)
        throw new Error(
          `There isn\`t so much goods in stock, ${productInStock.quantity} available`,
        );

      await client('products')
        .decrement({
          quantity: product.quantity,
        })
        .where('id', productInStock.id);

      const insertItem = client('order_item').insert({
        order_id: currentOrder.id,
        product_id: productInStock.id,
        quantity: product.quantity,
      });

      const updateQuantity = client.queryBuilder().update({
        quantity: client.raw('order_item.quantity + ?', [product.quantity]),
      });

      await client.raw(
        `${insertItem} ON CONFLICT ON CONSTRAINT uniq_order_item DO ${updateQuantity}`,
      );

      const orderList = await client('order_item')
        .select({
          type: client.raw('(select name from types where id = products.type_id)'),
          color: client.raw('(select name from colors where id = products.color_id)'),
          price: 'products.price',
          quantity: 'order_item.quantity',
        })
        .from('order_item')
        .innerJoin('products', 'order_item.product_id', 'products.id')
        .where('order_item.order_id', currentOrder.id);

      console.log(orderList);

      return orderList;
    } catch (error) {
      console.error(`ERROR: ${error.message || error}`);
      throw error;
    }
  }
}

module.exports = Database;
