/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    knex.schema.createTable('users', (table) => {
    table.increments('userID').primary(); // auto-incrementing PK
    table.string('username', 30).notNullable();
    table.string('password', 30).notNullable();
    table.string('userFirstName', 30).notNullable();
    table.string('userLastName', 30).notNullable();
    table.string('role', 1).notNullable();
  });

  // Seed initial users
  knex('users').insert([
    {
      username: 'manager1',
      password: 'managerpass1',
      userFirstName: 'Manager',
      userLastName: 'One',
      role: 'M'
    },
    {
      username: 'manager2',
      password: 'managerpass2',
      userFirstName: 'Manager',
      userLastName: 'Two',
      role: 'M'
    }
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

  
;

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
