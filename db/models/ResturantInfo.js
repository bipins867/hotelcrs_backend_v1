module.exports = (sequelize, DataTypes) => {
  const ResturantInfo = sequelize.define('ResturantInfo', {
    hotelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Hotels',
        key: 'id',
      },
    },
    breakfastCost: DataTypes.STRING,
    vegLunchCost: DataTypes.STRING,
    nonVegLunchCost: DataTypes.STRING,
    vegDinnerCost: DataTypes.STRING,
    nonVegDinnerCost: DataTypes.STRING,
    outsideFood: DataTypes.STRING,
    olaUberRapido: DataTypes.STRING,
    resturantMenu: DataTypes.JSONB,
    barMenu: DataTypes.JSONB,
    itineraryMenu: DataTypes.JSONB,
    menuType: DataTypes.STRING,
    breakfastType: DataTypes.STRING,
    breakfastServed: DataTypes.STRING,
    checkInCheckOutDetails: DataTypes.JSONB,
    driverDetails: DataTypes.JSONB,
    guestInfo: DataTypes.TEXT,
    resturantDetails: DataTypes.JSONB,
    resturantNumber: DataTypes.JSONB,
    resturantEmail: DataTypes.JSONB,
    transportCabDetails: DataTypes.JSONB,
    pickupPointDetails: DataTypes.JSONB,
    hourlyCharge: DataTypes.JSONB,
    outStationCharge: DataTypes.JSONB,
    extraKmCharge: DataTypes.JSONB,
    paymentLinks: DataTypes.JSONB,
    policies: DataTypes.JSONB,
    services: DataTypes.JSONB,
    terms: DataTypes.JSONB,
    numberOfCars: DataTypes.JSONB,
    specialNote: DataTypes.TEXT,
    carsEmailId: DataTypes.JSONB,
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    tableName: 'ResturantInfo'
  });

  ResturantInfo.associate = function(models) {
    ResturantInfo.belongsTo(models.Hotel, {
      foreignKey: 'hotelId',
      as: 'hotel'
    });
  };

  return ResturantInfo;
};
