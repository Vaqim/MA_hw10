const getProp = (prop, name) => `(select id from ${prop}s where name = '${name}')`;

exports.seed = async (knex) => {
  await Promise.all([knex('users').del(), knex('products').del()]);
  await Promise.all([knex('colors').del(), knex('types').del()]);

  await Promise.all([
    knex('colors').insert([
      { name: 'red' },
      { name: 'black' },
      { name: 'lime' },
      { name: 'navy' },
      { name: 'purple' },
    ]),
    knex('types').insert([
      { name: 'gloves' },
      { name: 'socks' },
      { name: 'hat' },
      { name: 'jeans' },
    ]),
  ]);

  await Promise.all([
    knex('products').insert([
      {
        color_id: knex.raw(getProp('color', 'red')),
        type_id: knex.raw(getProp('type', 'gloves')),
        price: '30.00',
        quantity: 45,
        weight: 25,
      },
      {
        color_id: knex.raw(getProp('color', 'black')),
        type_id: knex.raw(getProp('type', 'socks')),
        price: '3.25',
        quantity: 60,
        weight: 15,
      },
      {
        color_id: knex.raw(getProp('color', 'lime')),
        type_id: knex.raw(getProp('type', 'hat')),
        price: '23.00',
        quantity: 42,
        weight: 55,
      },
      {
        color_id: knex.raw(getProp('color', 'navy')),
        type_id: knex.raw(getProp('type', 'jeans')),
        price: '144.30',
        quantity: 0,
        weight: 200,
      },
      {
        color_id: knex.raw(getProp('color', 'purple')),
        type_id: knex.raw(getProp('type', 'socks')),
        price: '8.50',
        quantity: 9,
        weight: 15,
      },
    ]),
    knex('users').insert({
      id: 1,
      name: 'Vaqim',
    }),
  ]);
};
