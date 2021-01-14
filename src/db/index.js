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

  static async switchStatus(orderId, status) {
    try {
      let res;
      if (!(orderId && status)) throw new Error('Incorrect input data');

      const [current] = await client('orders').select('current_status').where('id', orderId);
      if (!current.current_status) throw new Error('Order wasn`t defined');

      switch (status) {
        case 'pending':
          if (current.current_status === 'pending') throw new Error('Status is already "pending"');

          res = await client('orders').update(
            {
              current_status: 'pending',
            },
            ['*'],
          );

          await client('order_item').del().where('order_id', orderId);
          break;

        case 'confirmed':
          if (current.current_status === 'confirmed')
            throw new Error('Status is already "confirmed"');
          if (current.current_status === 'cancelled') throw new Error('Order is cancelled!');

          res = await client('orders').update(
            {
              current_status: 'confirmed',
            },
            ['*'],
          );
          break;

        case 'cancelled':
          if (current.current_status === 'cancelled')
            throw new Error('Status is already "cancelled"');
          if (current.current_status === 'confirmed') throw new Error('Order is confirmed!');

          res = await client('orders').update(
            {
              current_status: 'cancelled',
            },
            ['*'],
          );

          // eslint-disable-next-line no-case-declarations
          const products = await client('order_item')
            .select('product_id', 'quantity')
            .where('order_id', orderId);

          products.forEach(async (prod) => {
            await client('products')
              .increment('quantity', prod.quantity)
              .where('id', prod.product_id);
          });

          await client('order_item').del().where('order_id', orderId);

          break;

        default:
          throw new Error('Unknown status');
      }

      console.log('res: ', res, status);
      return res;
    } catch (error) {
      console.error(`ERROR: ${error.message || error}`);
      throw error;
    }
  }
}

module.exports = Database;
