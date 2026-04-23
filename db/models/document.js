'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Document extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Document.belongsTo(models.Hotel, {
        foreignKey: "hotelId",
        as: "hotel",
      });
      Document.belongsTo(models.Country, { foreignKey: "countryId", as: "country" });
      Document.belongsTo(models.State, { foreignKey: "stateId", as: "state" });
      Document.belongsTo(models.City, { foreignKey: "cityId", as: "city" });
      Document.belongsTo(models.User, { foreignKey: "createdBy", as: "creator" });
      Document.belongsTo(models.User, { foreignKey: "updatedBy", as: "updater" });
      Document.belongsTo(models.User, { foreignKey: "deletedBy", as: "deleter" });
    }
  }
  
  Document.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      countryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      stateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      hotelId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Hotels",
          key: "id",
        },
      },
      documentType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      documentName: {
        type: DataTypes.STRING,
      },
      filePath: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      uploadedBy: {
        type: DataTypes.INTEGER,
      },
      uploadDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      approvalStatus: {
        type: DataTypes.STRING,
      },
      adminComments: {
        type: DataTypes.TEXT,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
      },
      deletedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "id",
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deletedAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'Document',
      timestamps: true,
      paranoid: true, // Enables soft delete by using `deletedAt`
    }
  );

  return Document;
};
