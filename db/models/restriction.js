module.exports = (sequelize, DataTypes) => {
  const Restriction = sequelize.define('Restriction', {
    rateId: DataTypes.INTEGER,
    blockInventory: DataTypes.BOOLEAN,
    unblockInventory: DataTypes.BOOLEAN,
    closeToArrival: DataTypes.BOOLEAN,
    inactivateCTA: DataTypes.BOOLEAN,
    closeToDeparture: DataTypes.BOOLEAN,
    inactivateCTD: DataTypes.BOOLEAN,
    minLengthOfStay: DataTypes.INTEGER,
    cutoff: DataTypes.INTEGER,
    cutoffType: DataTypes.STRING,
    cutoffValue: DataTypes.FLOAT,
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  });

  Restriction.associate = function(models) {
    Restriction.belongsTo(models.RoomRate, {
      foreignKey: 'rateId',
      as: 'roomRate',
    });
  };

  return Restriction;
};
