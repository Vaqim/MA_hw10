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

      await client('products')
        .decrement({
          quantity: productToOrder.quantity,
        })
        .where('id', productInStock.id);

      const insertItem = client('order_item').insert({
        order_id: orderId,
        product_id: productInStock.id,
        quantity: productToOrder.quantity,
      });

      const updateQuantity = client.queryBuilder().update({
        quantity: client.raw('order_item.quantity + ?', [productToOrder.quantity]),
      });

      await client.raw(
        `${insertItem} ON CONFLICT ON CONSTRAINT uniq_order_item DO ${updateQuantity}`,
      );
    } catch (error) {
      console.error(error.message);
      throw error;
    }
  }

  static async getOrder(orderId) {
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

  // static async addItemToOrder(userId, product) {
  //   try {
  //     // currentOrderId = await this.getOrCreateOrder(userId);

  //     product.quantity = product.quantity || 1;
  //     // productInStock = await this.getProductParams(product);

  //     // await addProductToOrder()

  //     // const orderList = await this.getOrder();

  //     return orderList;
  //   } catch (error) {
  //     console.error(`ERROR: ${error.message || error}`);
  //     throw error;
  //   }
  // }

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

      return res;
    } catch (error) {
      console.error(`ERROR: ${error.message || error}`);
      throw error;
    }
  }

  static async getProductsFromOrder(orderId) {
    try {
      const res = await client('order_item')
        .select({
          price: 'products.price',
          quantity: 'order_item.quantity',
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
