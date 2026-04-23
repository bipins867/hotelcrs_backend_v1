const { ResturantInfo } = require('../db/models');

exports.getResturantDetails = async (snapshot) => {

  try {
    if (snapshot?.hotels?.restaurantInfo) return snapshot?.hotels?.restaurantInfo;
    const hotelId = snapshot?.hotels?.id;

    const resturantInfo = await ResturantInfo.findOne({
      where: {
        hotelId: hotelId
      }
    });

    return resturantInfo ? resturantInfo : {};
  } catch (error) {
    console.error('Error fetching restaurant details:', error);
    return null;
  }
};
