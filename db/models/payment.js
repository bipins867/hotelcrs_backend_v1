'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // Define associations
      Payment.belongsTo(models.Reservation, { 
        foreignKey: 'reservationId', 
        as: 'reservation',
        onDelete: 'CASCADE'
      });
      
      Payment.belongsTo(models.User, { 
        foreignKey: 'createdBy', 
        as: 'creator'
      });
      
      Payment.belongsTo(models.User, { 
        foreignKey: 'updatedBy', 
        as: 'updater'
      });
    }
  }

  Payment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reservationId: { 
      type: DataTypes.STRING, 
      allowNull: false,
      references: {
        model: 'Reservations',
        key: 'id'
      },
      validate: {
        notNull: {
          msg: 'Reservation ID is required'
        },
      }
    },
    paymentDate: { 
      type: DataTypes.DATEONLY, 
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Payment date is required'
        },
        isDate: {
          msg: 'Payment date must be a valid date'
        }
      }
    },
    type: { 
      type: DataTypes.ENUM('Paid', 'Received'),
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Type is required'
        },
        isIn: {
          args: [['Paid', 'Received']],
          msg: 'Payment type must be one of: Paid, Received'
        }
      }
    },
    modeOfPayment: { 
      type: DataTypes.ENUM('NEFT', 'IMPS', 'Transfer', 'Cash', 'Cheque', 'UPI', 'Card', 'DD', 'Adjustment'),
      allowNull: false,
      validate: {
        notNull: {
          msg: 'Mode of payment is required'
        },
        isIn: {
          args: [['NEFT', 'IMPS', 'Transfer', 'Cash', 'Cheque', 'UPI', 'Card', 'DD', 'Adjustment']],
          msg: 'Mode of payment must be one of: NEFT, IMPS, Transfer, Cash, Cheque, UPI, Card, DD, Adjustment'
        }
      }
    },
    bankReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
    },
    remark: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    amount: { 
      type: DataTypes.FLOAT, 
      allowNull: false,
      validate: {
        isFloat: {
          msg: 'Amount must be a valid number'
        }
      }
    },
    adjustmentBooking: { 
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isString: {
          msg: 'Adjustment booking must be a string'
        }
      }
    },
    adjustmentAmount: { 
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: {
          msg: 'Adjustment amount must be a valid number'
        }
      }
    },
    receipt: { 
      type: DataTypes.JSONB,
      allowNull: true,
    },
    upi: { 
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isString: {
          msg: 'UPI ID must be a string'
        }
      }
    },
    note: { 
      type: DataTypes.TEXT, 
      allowNull: true 
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isString: {
          msg: 'Invoice number must be a string'
        }
      }
    },
    isCancel: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      validate: {
        isBoolean: {
          msg: 'isCancel must be a boolean value'
        }
      }
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'Payments',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['reservationId']
      },
      {
        fields: ['paymentDate']
      },
      {
        unique: true,
        fields: ['invoiceNumber']
      },
    ],
  });

  return Payment;
};