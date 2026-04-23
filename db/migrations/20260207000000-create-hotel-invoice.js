'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('HotelInvoices', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            reservationId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Reservations',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            invoiceNumber: {
                type: Sequelize.STRING,
                allowNull: false
            },
            guestName: {
                type: Sequelize.STRING,
                allowNull: false
            },
            hotelName: {
                type: Sequelize.STRING,
                allowNull: false
            },
            fileUrl: {
                type: Sequelize.JSONB,
                allowNull: false
            },
            status: {
                type: Sequelize.ENUM('Pending', 'Approved', 'Rejected'),
                defaultValue: 'Pending'
            },
            rejectionReason: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            approvedAt: {
                type: Sequelize.DATE,
                allowNull: true
            },
            uploadedBy: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id'
                }
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            deletedAt: {
                type: Sequelize.DATE
            }
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('HotelInvoices');
    }
};
