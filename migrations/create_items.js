/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('items', (table) => {
    table.increments('itemID').primary(); // auto-incrementing PK
    table.integer('userID').unsigned().references('userID').inTable('users').onDelete('SET NULL'); // optional FK
    table.string('itemName', 60).notNullable();
    table.text('itemDesc').notNullable();
    table.string('category', 30).notNullable();
    table.string('itemImagePath', 500);
    table.date('itemDateClaimed');
  });

  // Seed initial items
  await knex('items').insert([
    {
      itemName: 'Porcelain Teacup',
      itemDesc: 'From her 50th anniversary trip to England.',
      category: 'keepsakes'
    },
    {
      itemName: 'Quilt Blanket',
      itemDesc: 'Handmade with love by Grandma.',
      category: 'keepsakes'
    },
    {
      itemName: 'Photo Album',
      itemDesc: 'Family memories through the years.',
      category: 'books'
    },
    {
      itemName: 'Silver Necklace',
      itemDesc: 'Gift from Grandpa on their 40th anniversary.',
      category: 'jewelry'
    }
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('items');
};
