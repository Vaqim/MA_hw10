exports.up = async (knex) => {
  // colors
  // types
  // products
  // orders
  // orderItems

  const createExt = knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  const createFunc = knex.schema.raw(`
  CREATE OR REPLACE FUNCTION updated_at_timastamp() RETURNS TRIGGER
    LANGUAGE plpgsql
    AS
    $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$;
  `);

  const createColors = knex.schema.createTable('colors', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('name').notNullable().unique();
    table.timestamp('deleted_at').nullable();
  });

  const createTypes = knex.schema.createTable('types', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.string('name').notNullable().unique();
    table.timestamp('deleted_at').nullable();
  });

  await Promise.all([createExt, createFunc, createColors, createTypes]);

  await knex.schema.createTable('products', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('color_id').notNullable().references('colors.id');
    table.uuid('type_id').notNullable().references('types.id');
    table.decimal('price').notNullable();
    table.integer('quantity').notNullable().unsigned().defaultTo(0);
    table.timestamp('deleted_at').nullable();
    table.timestamps(true, true);
  });

  const addConstraint = knex.schema.raw(
    'ALTER TABLE products ADD CONSTRAINT uniq_product UNIQUE(color_id, type_id, price)',
  );

  const createTrigger = knex.schema.raw(`
  CREATE TRIGGER updated_at_timastamp
  BEFORE UPDATE
  ON products
  FOR EACH ROW
  EXECUTE PROCEDURE updated_at_timastamp();
  `);

  const createStatusType = knex.schema.raw(
    "CREATE TYPE status AS ENUM ('pending', 'confirmed', 'cancelled')",
  );

  await Promise.all([addConstraint, createTrigger, createStatusType]);

  await knex.schema.createTable('users', (table) => {
    table.integer('id').notNullable().primary();
    table.string('name').notNullable().unique();
  });

  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.integer('user_id').notNullable().unique().references('users.id');
    table.string('from').nullable();
    table.string('to').nullable();
  });

  await knex.schema.raw(`ALTER TABLE orders ADD COLUMN current_status STATUS DEFAULT 'pending'`);

  await knex.schema.createTable('order_item', (table) => {
    table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary();
    table.uuid('order_id').references('orders.id').notNullable();
    table.uuid('product_id').references('products.id').notNullable();
    table.integer('quantity').defaultTo(0).notNullable();
  });
  await knex.schema.raw(
    'ALTER TABLE order_item ADD CONSTRAINT uniq_order_item UNIQUE(order_id, product_id)',
  );
};

exports.down = async (knex) => {
  await knex.schema.dropTable('order_item');
  await knex.schema.dropTable('orders');

  await knex.schema.dropTable('users');

  await knex.schema.raw('DROP TYPE IF EXISTS status');

  await knex.schema.dropTable('products');
  await knex.raw('DROP FUNCTION IF EXISTS updated_at_timastamp()');

  await knex.schema.dropTable('colors');
  await knex.schema.dropTable('types');

  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
};
