exports.up = async (knex) => {
  await knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  await Promise.all([
    knex.schema.raw(`
      CREATE OR REPLACE FUNCTION updated_at_timestamp() RETURNS TRIGGER
        LANGUAGE plpgsql
        AS
        $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$;
    `),
    knex.schema.createTable('colors', (table) => {
      table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
      table.string('name').notNullable().unique();
      table.timestamp('deleted_at').nullable();
    }),
    knex.schema.createTable('types', (table) => {
      table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
      table.string('name').notNullable().unique();
      table.timestamp('deleted_at').nullable();
    }),
  ]);

  await knex.schema.createTable('products', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('color_id').notNullable().references('colors.id');
    table.uuid('type_id').notNullable().references('types.id');
    table.decimal('price').notNullable();
    table.integer('quantity').notNullable().unsigned().defaultTo(0);
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);
  });

  await Promise.all([
    knex.schema.raw(`
      CREATE TRIGGER updated_at_timestamp
      BEFORE UPDATE
      ON products
      FOR EACH ROW
      EXECUTE PROCEDURE updated_at_timestamp();
    `),
    knex.schema.createTable('users', (table) => {
      table.integer('id').notNullable().primary();
      table.string('name').notNullable().unique();
    }),
  ]);

  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.integer('user_id').notNullable().unique().references('users.id');
    table
      .enu('status', ['pending', 'confirmed', 'cancelled'], {
        enumName: 'order_status',
        useNative: true,
      })
      .notNullable()
      .defaultTo('pending');
  });

  await knex.schema.createTable('order_item', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('order_id').references('orders.id').notNullable();
    table.uuid('product_id').references('products.id').notNullable();
    table.integer('quantity').defaultTo(0).notNullable();
    table.unique(['order_id', 'product_id'], 'uniq_order_item');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('order_item');
  await knex.schema.dropTable('orders');

  await Promise.all([
    knex.schema.dropTable('users'),
    knex.schema.raw('DROP TYPE IF EXISTS status'),
    knex.schema.dropTable('products'),
  ]);

  await Promise.all([
    knex.raw('DROP FUNCTION IF EXISTS updated_at_timestamp()'),
    knex.schema.dropTable('colors'),
    knex.schema.dropTable('types'),
    knex.raw('DROP TYPE IF EXISTS order_status'),
  ]);

  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
};
