'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Inquiries', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      hotelId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Hotels',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      inquiryCode: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      guestName: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      guestEmail: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      whatsappNumber: {
        type: Sequelize.STRING,
        allowNull: true
      },
      numberOfRooms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
        validate: {
          min: 1
        }
      },
      checkInDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      checkOutDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      adult: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
        validate: {
          min: 1
        }
      },
      children: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('Inquiries', ['hotelId']);
    await queryInterface.addIndex('Inquiries', ['createdAt']);
    await queryInterface.addIndex('Inquiries', ['checkInDate']);
    await queryInterface.addIndex('Inquiries', ['guestEmail']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Inquiries');
  }
};
