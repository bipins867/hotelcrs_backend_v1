'use strict';

const bcrypt = require('bcryptjs');  // We will use bcrypt to hash the password

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create an admin user with a specific email and password
    const adminUser = {
      name: 'Admin User',
      email: 'admin@example.com',
      password: bcrypt.hashSync('adminpassword', 10),  // Use bcrypt to hash the password
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert the admin user into the 'Users' table
    await queryInterface.bulkInsert('Users', [adminUser], {});
  },

  down: async (queryInterface, Sequelize) => {
    // Delete the admin user by email
    await queryInterface.bulkDelete('Users', { email: 'admin@example.com' }, {});
  }
};
