exports.up = async (knex) => {
  await Promise.all([
    knex.schema.alterTable('products', (table) => {
      table.integer('weight').unsigned().notNullable();
    }),
    knex.schema.alterTable('orders', (table) => {
      table.string('from').nullable();
      table.string('to').nullable();
    }),
  ]);
};

exports.down = async (knex) => {
  await Promise.all([
    knex.schema.alterTable('orders', (table) => {
      table.dropColumns('from', 'to');
    }),
    knex.schema.alterTable('products', (table) => {
      table.dropColumn('weight');
    }),
  ]);
};
