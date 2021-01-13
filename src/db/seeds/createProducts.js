const getProp = (prop, name) => `(select id from ${prop}s where name = '${name}')`;

exports.seed = async (knex) => {
  await knex('users').del();
  await knex('products').del();
  await knex('colors').del();
  await knex('types').del();

  await knex('colors').insert([
    { name: 'red' },
    { name: 'black' },
    { name: 'lime' },
    { name: 'navy' },
    { name: 'purple' },
  ]);

  await knex('types').insert([
    { name: 'gloves' },
    { name: 'socks' },
    { name: 'hat' },
    { name: 'jeans' },
  ]);

  await knex('products').insert([
    {
      color_id: knex.raw(getProp('color', 'red')),
      type_id: knex.raw(getProp('type', 'gloves')),
      price: '30.00',
      quantity: 5,
    },
    {
      color_id: knex.raw(getProp('color', 'black')),
      type_id: knex.raw(getProp('type', 'socks')),
      price: '3.25',
      quantity: 10,
    },
    {
      color_id: knex.raw(getProp('color', 'lime')),
      type_id: knex.raw(getProp('type', 'hat')),
      price: '23.00',
      quantity: 42,
    },
    {
      color_id: knex.raw(getProp('color', 'navy')),
      type_id: knex.raw(getProp('type', 'jeans')),
      price: '144.30',
      quantity: 0,
    },
    {
      color_id: knex.raw(getProp('color', 'purple')),
      type_id: knex.raw(getProp('type', 'socks')),
      price: '8.50',
      quantity: 9,
    },
  ]);

  await knex('users').insert({
    id: 1,
    name: 'Vaqim',
  });
};
