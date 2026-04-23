const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Commission extends Model {
    static associate(models) {
      Commission.belongsTo(models.Hotel, {
        foreignKey: "hotelId",
        as: "hotel",
      });
      Commission.belongsTo(models.Country, {
        foreignKey: "countryId",
        as: "country",
      });
      Commission.belongsTo(models.State, {
        foreignKey: "stateId",
        as: "state",
      });
      Commission.belongsTo(models.City, { foreignKey: "cityId", as: "city" });
    }
  }

  Commission.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
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
        unique: true, // Ensure each hotel name is unique
      },
      b2cCommission: {
        type: DataTypes.DECIMAL(10, 2), // 10 total digits, 2 after decimal
        allowNull: false,
        validate: {
          min: 0,
          max: 100, // Commission percentage should be between 0 and 100
        },
      },
      b2bCommission: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 100,
        },
      },
      taggedHotels: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rateMode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      singleOccupancy: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      doubleOccupancy: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      tripleOccupancy: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      extraBed: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      percentageModeValue: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      monthlySubscriptionCharge: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      monthlyChannelManagerCharge: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      bookingInstructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      documentUrl: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Commission",
      timestamps: true,
      paranoid: true,
    }
  );

  return Commission;
};
