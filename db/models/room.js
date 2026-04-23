const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    static associate(models) {
      Room.belongsTo(models.Hotel, {
        foreignKey: "hotelId",
        as: "hotel",
      });
      Room.hasMany(models.TaggedRatePlan, { foreignKey: 'roomId', as: 'taggedRatePlan' });
    }
  }

  Room.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      hotelId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Hotels",
          key: "id",
        },
      },
      roomName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      totalRoom: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      images: {
        type: DataTypes.JSONB
      },
      videos: {
        type: DataTypes.JSONB
      },
      youtubeUrls: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Array of YouTube video URLs with embed URLs and video IDs'
      },
      area: {
        type: DataTypes.FLOAT,
      },
      roomType: {
        type: DataTypes.INTEGER
      },
      roomView: {
        type: DataTypes.INTEGER
      },
      smokingPreference: {
        type: DataTypes.STRING
      },
      bedType: {
        type: DataTypes.INTEGER
      },
      baseAdults: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      maximumAdults: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      numberOfMaxChildren: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      maximumOccupancy: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.INTEGER,
      },
      description: {
        type: DataTypes.TEXT,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
    },
    {
      sequelize,
      modelName: "Room",
      timestamps: true,
      paranoid: true,
    }
  );

  return Room;
};
