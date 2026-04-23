'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OtaListing extends Model {
    static associate(models) {
      OtaListing.belongsTo(models.Hotel, {
        foreignKey: 'hotelId',
        as: 'hotel'
      });
    }
  }

  OtaListing.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    otaName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    famousIn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Listed', 'Not Listed', 'Email Sent', 'Pending', 'Rejected', 'Duplicate'),
      allowNull: false,
      defaultValue: 'Not Listed'
    },
    listingDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    listedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    healthAnalysis: {
      type: DataTypes.ENUM('Completed', 'Not Completed', 'Verified 100%'),
      allowNull: true,
      defaultValue: 'Not Completed'
    },
    liveStatus: {
      type: DataTypes.ENUM('Live', 'Not Live', 'Pending', 'Rejected', 'Duplicate'),
      allowNull: false,
      defaultValue: 'Not Live'
    },
    listingUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fileUrl: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Hotels',
        key: 'id'
      }
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
  }, {
    sequelize,
    modelName: 'OtaListing',
    tableName: 'OtaListings',
    timestamps: true,
    paranoid: true
  });

  return OtaListing;
};
