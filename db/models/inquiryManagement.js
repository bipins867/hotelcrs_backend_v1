'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Inquiry extends Model {
    static associate(models) {
      Inquiry.belongsTo(models.Hotel, { foreignKey: 'hotelId', as: 'hotel' });
      Inquiry.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
      Inquiry.belongsTo(models.User, { foreignKey: 'updatedBy', as: 'updater' });
    }
  }

  Inquiry.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    inquiryCode: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Hotels',
        key: 'id'
      }
    },
    guestName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    guestEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    whatsappNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    numberOfRooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    checkInDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    checkOutDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    adult: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      validate: {
        min: 1
      }
    },
    children: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
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
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  }, {
    sequelize,
    modelName: 'Inquiry',
    tableName: 'Inquiries',
    timestamps: true,
    paranoid: true
  });

  return Inquiry;
};
