/**
 * WhatsApp Data Service
 * Handles fetching and formatting data for WhatsApp templates
 */

const { Hotel, Country, State, City, Policy, HotelDetails, ResturantInfo, Room, Rate, RoomType, RatePlan, TaggedRatePlan, RoomRate, AdultRate, Inclusion } = require('../../db/models');
const { serviceMap } = require('../../utils/hotelServices');
const TemplateHelper = require('../../utils/templateHelper');
const { getSignedUrl } = require('../../utils/s3Helper');

class WhatsAppDataService {
  /**
   * Fetch comprehensive hotel data for WhatsApp templates
   * @param {number} hotelId - Hotel ID
   * @param {Object} inquiryData - Basic inquiry data
   * @returns {Promise<Object>} - Formatted data for templates
   */
  static async fetchHotelData(hotelId, inquiryData) {
    try {
      // Fetch hotel with all associations
      const hotelData = await Hotel.findByPk(hotelId, {
        include: [
          { model: Country, as: "country" },
          { model: State, as: "state" },
          { model: City, as: "city" },
          { model: Policy, as: "policy" },
          { model: ResturantInfo, as: "restaurantInfo" }
        ]
      });

      if (!hotelData) {
        throw new Error(`Hotel with ID ${hotelId} not found`);
      }

      // Calculate number of nights
      const checkIn = new Date(inquiryData.checkInDate);
      const checkOut = new Date(inquiryData.checkOutDate);
      const noOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      const { qrCode1, qrCode2, qrCode3 } = hotelData.restaurantInfo.paymentLinks

      const firstQRcode = qrCode1[0] ? getSignedUrl(qrCode1[0]) : null;
      const secondQRcode = qrCode2[0] ? getSignedUrl(qrCode2[0]) : null;
      const thirdQRcode = qrCode3[0] ? getSignedUrl(qrCode3[0]) : null;

      // Format comprehensive data for templates
      return {
        // Basic inquiry data
        guestName: inquiryData.guestName,
        hotelName: hotelData.name,
        city: hotelData.city?.name,
        state: hotelData.state?.name,
        hotelAddress: hotelData.address,
        checkInDate: inquiryData.checkInDate ? new Date(inquiryData.checkInDate).toLocaleDateString() : '',
        checkOutDate: inquiryData.checkOutDate ? new Date(inquiryData.checkOutDate).toLocaleDateString() : '',
        adult: inquiryData.adult,
        children: inquiryData.children,
        numberOfRooms: inquiryData.numberOfRooms,
        noOfNights: noOfNights,
        inquiryId: inquiryData.inquiryId,

        // Hotel Information Template Data
        checkInTime: hotelData?.restaurantInfo?.checkInCheckOutDetails?.checkInTime,
        checkOutTime: hotelData?.restaurantInfo?.checkInCheckOutDetails?.checkOutTime,
        lastCheckInTime: hotelData?.restaurantInfo?.checkInCheckOutDetails?.lastCheckInTime,
        lastCheckOutTime: hotelData?.restaurantInfo?.checkInCheckOutDetails?.lastCheckoutTime,
        earlyCheckInOption: hotelData?.restaurantInfo?.checkInCheckOutDetails?.isEarlyCheckIn,
        earlyCheckInCharge: hotelData?.restaurantInfo?.checkInCheckOutDetails?.earlyCheckInCharge,
        lateCheckOutOption: hotelData?.restaurantInfo?.checkInCheckOutDetails?.isLateCheckOut,
        lateCheckOutCharge: hotelData?.restaurantInfo?.checkInCheckOutDetails?.lateCheckOutCharge,
        checkInAge: hotelData?.restaurantInfo?.checkInCheckOutDetails?.checkInAge,
        childAgeFree: hotelData?.restaurantInfo?.checkInCheckOutDetails?.childAgeFree,
        documentsAccepted: hotelData?.restaurantInfo?.checkInCheckOutDetails?.checkinDocs?.join(', '),
        childAgeChargeable: "Above 7 years",
        childCharge: hotelData?.restaurantInfo?.checkInCheckOutDetails?.childCharge,
        extraPersonCharge: hotelData?.restaurantInfo?.checkInCheckOutDetails?.extraBedCharge,
        petPolicy: hotelData?.restaurantInfo?.policies?.petPolicy,
        unmarriedCouplePolicy: hotelData?.restaurantInfo?.policies?.unmarriedCouple,
        localGuestPolicy: hotelData?.restaurantInfo?.policies?.localGuest,
        visitorPolicy: hotelData?.restaurantInfo?.checkInCheckOutDetails?.visitorAllowed === 'Yes' ? 'Allowed' : 'Not Allowed',
        services: { ...this.getServicesData(hotelData?.restaurantInfo?.services) },
        specialNote: hotelData?.restaurantInfo?.specialNote,
        transportCabDetails: hotelData?.restaurantInfo?.transportCabDetails,
        pickupPointDetails: hotelData?.restaurantInfo?.pickupPointDetails,
        hourlyCharge: hotelData?.restaurantInfo?.hourlyCharge,
        outStationCharge: hotelData?.restaurantInfo?.outStationCharge,
        extraKmCharge: hotelData?.restaurantInfo?.extraKmCharge,
        cabAvailability: hotelData?.restaurantInfo?.olaUberRapido,
        paymentLink: hotelData?.restaurantInfo?.paymentLinks,
        resturantDetails: hotelData?.restaurantInfo?.resturantDetails,
        breakfastCost: hotelData.restaurantInfo?.breakfastCost,
        lunchVeg: hotelData.restaurantInfo?.vegLunchCost,
        lunchNonVeg: hotelData.restaurantInfo?.nonVegLunchCost,
        dinnerVeg: hotelData.restaurantInfo?.vegDinnerCost,
        dinnerNonVeg: hotelData.restaurantInfo?.nonVegDinnerCost,
        breakfastType: hotelData.restaurantInfo?.breakfastType,
        breakfastServedIn: hotelData.restaurantInfo?.breakfastServed,
        outsideFoodPolicy: hotelData.restaurantInfo?.outsideFood,
        menuType: hotelData.restaurantInfo?.menuType,
        restaurantContact: hotelData.restaurantInfo?.resturantNumber?.join(', '),
        restaurantEmail: hotelData.restaurantInfo?.resturantEmail?.join(', '),
        googleMaps: TemplateHelper.getGoogleMapsLink(hotelData),
        photos: '',
        videos: '',
        paymentLink1: hotelData.restaurantInfo?.paymentLinks?.link1,
        paymentLink2: hotelData.restaurantInfo?.paymentLinks?.link2,
        paypalPaymentLink1: hotelData.restaurantInfo?.paymentLinks?.paypalLink1,
        paypalPaymentLink2: hotelData.restaurantInfo?.paymentLinks?.paypalLink2,
        qrCode1: firstQRcode,
        qrCode2: secondQRcode,
        qrCode3: thirdQRcode,
        qrCodeArray: [firstQRcode, secondQRcode, thirdQRcode],

        // Additional Data for Email Template
        country: hotelData.country?.name,
        terms: hotelData?.restaurantInfo?.terms,
        driverDetails: hotelData?.restaurantInfo?.driverDetails,
        pickupPointDetails: hotelData?.restaurantInfo?.pickupPointDetails,
        hourlyCharge: hotelData?.restaurantInfo?.hourlyCharge,
        extraKmCharge: hotelData?.restaurantInfo?.extraKmCharge,
        outStationCharge: hotelData?.restaurantInfo?.outStationCharge,

        // Room Types & Rates Template Data - Dynamic from database
        ...(await (async () => {
          const ratesData = await this.getRoomRatesData(hotelId, inquiryData.checkInDate, inquiryData.checkOutDate);
          const estimatedTotal = this.computeEstimatedTotal(
            inquiryData.numberOfRooms || 1,
            inquiryData.adult || 0,
            inquiryData.children || 0,
            noOfNights,
            ratesData.roomRatesDetailed
          );
          return { ...ratesData, estimatedTotal };
        })())
      };
    } catch (error) {
      console.error('Error fetching hotel data for WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Get services data from database
   * @param {Array} services - Services array from database
   * @returns {Object} - Formatted services data
   */
  static getServicesData(services) {
    if (!services || !Array.isArray(services)) {
      return {};
    }

    // Service mapping based on frontend serviceList

    const servicesData = {};

    // Process each service from database
    services.forEach(service => {
      const serviceId = service.name; // This should be the service ID from frontend
      const serviceInfo = serviceMap[serviceId];

      if (serviceInfo) {
        const availability = service.availability === 'Yes' ? 'Available' : 'Not Available';
        const type = service.freeOrPaid;

        servicesData[serviceId] = {
          availability: availability,
          type: type,
          label: serviceInfo,
        };
      }
    });

    // Return only services that exist in database
    return servicesData;
  }

  /**
   * Get room rates data from database
   * @param {number} hotelId - Hotel ID
   * @param {string} checkInDate - Check-in date
   * @param {string} checkOutDate - Check-out date
   * @returns {Promise<Object>} - Formatted room rates data
   */
  static async getRoomRatesData(hotelId, checkInDate, checkOutDate) {
    try {
      const { Op } = require('sequelize');

      // Fetch RoomRates within date range with associations
      const roomRates = await RoomRate.findAll({
        where: {
          hotelId,
          idate: { [Op.between]: [checkInDate, checkOutDate] }
        },
        include: [
          { model: Room, as: 'room' },
          { model: RatePlan, as: 'ratePlan' },
          { model: AdultRate, as: 'adultRates' }
        ]
      });

      if (!roomRates || roomRates.length === 0) {
        return this.getDefaultRoomRates();
      }

      // Build inclusion lookup for (roomId, ratePlanId)
      const pairKeys = Array.from(new Set(roomRates.map(rr => `${rr.roomId}|${rr.ratePlanId}`)));
      const roomIds = Array.from(new Set(roomRates.map(rr => rr.roomId)));
      const ratePlanIds = Array.from(new Set(roomRates.map(rr => rr.ratePlanId)));

      const tagged = await TaggedRatePlan.findAll({
        where: { roomId: { [Op.in]: roomIds }, ratePlanId: { [Op.in]: ratePlanIds } }
      });

      const inclusionIdSet = new Set();
      tagged.forEach(t => {
        if (Array.isArray(t.inclusionId)) t.inclusionId.forEach(id => inclusionIdSet.add(id));
      });
      const inclusionIds = Array.from(inclusionIdSet).filter(Boolean);
      const inclusionMap = {};
      if (inclusionIds.length) {
        const inclusionRows = await Inclusion.findAll({ where: { id: { [Op.in]: inclusionIds } } });
        inclusionRows.forEach(r => { inclusionMap[r.id] = r.name; });
      }

      const pairToInclusions = {};
      tagged.forEach(t => {
        const key = `${t.roomId}|${t.ratePlanId}`;
        const names = (Array.isArray(t.inclusionId) ? t.inclusionId : []).map(id => inclusionMap[id]).filter(Boolean);
        pairToInclusions[key] = names;
      });

      // Aggregate by roomName and ratePlan
      const detailed = {};
      roomRates.forEach(rr => {
        const roomTypeName = rr.room?.roomName || 'Room';
        const ratePlanName = rr.ratePlan?.name || 'RatePlan';
        const key = `${rr.roomId}|${rr.ratePlanId}`;

        if (!detailed[roomTypeName]) detailed[roomTypeName] = {};
        if (!detailed[roomTypeName][ratePlanName]) {
          detailed[roomTypeName][ratePlanName] = {
            sgl: [],
            dbl: [],
            extraAdult: [],
            extraChild: [],
            inclusions: pairToInclusions[key] || []
          };
        }

        // AdultRate rows: map adult=1 => single, adult=2 => double
        (rr.adultRates || []).forEach(ar => {
          if (ar.adult === 1) detailed[roomTypeName][ratePlanName].sgl.push(Number(ar.amount));
          if (ar.adult === 2) detailed[roomTypeName][ratePlanName].dbl.push(Number(ar.amount));
        });

        if (rr.extraAdultAmount != null) detailed[roomTypeName][ratePlanName].extraAdult.push(Number(rr.extraAdultAmount));
        if (rr.paidChildFiveToTwelve != null) detailed[roomTypeName][ratePlanName].extraChild.push(Number(rr.paidChildFiveToTwelve));
      });

      // Reduce arrays across date range (use min for display)
      const compact = {};
      Object.keys(detailed).forEach(roomType => {
        compact[roomType] = [];
        Object.keys(detailed[roomType]).forEach(rp => {
          const e = detailed[roomType][rp];
          const pick = arr => arr.length ? Math.min(...arr) : null;
          compact[roomType].push({
            ratePlanName: rp,
            inclusions: e.inclusions,
            sgl: pick(e.sgl),
            dbl: pick(e.dbl),
            extraAdult: pick(e.extraAdult),
            extraChild: pick(e.extraChild)
          });
        });
      });

      return {
        roomCategories: Object.keys(compact).join(', '),
        roomRatesDetailed: compact
      };
    } catch (error) {
      console.error('Error fetching room rates data:', error);
      return this.getDefaultRoomRates();
    }
  }

  /**
   * Get default room rates when no data is available
   * @returns {Object} - Default room rates
   */
  static getDefaultRoomRates() {
    return {
      roomCategories: 'Contact hotel for details',
      roomRates: {}
    };
  }

  /**
   * Compute estimated total based on adults, children, rooms and available rates
   * Strategy: Use the first available room type and its first rate plan.
   * Base assumes up to 2 adults per room at DBL rate when available, otherwise SGL.
   * Remaining adults charged as extraAdult; children charged as extraChild.
   */
  static computeEstimatedTotal(numberOfRooms, totalAdults, totalChildren, nights, roomRatesDetailed) {
    try {
      const rooms = Math.max(1, Number(numberOfRooms) || 1);
      const adults = Math.max(0, Number(totalAdults) || 0);
      const children = Math.max(0, Number(totalChildren) || 0);
      const numNights = Math.max(1, Number(nights) || 1);

      if (!roomRatesDetailed || Object.keys(roomRatesDetailed).length === 0) {
        // fallback heuristic: 2500 per room per night
        return String(numNights * rooms * 2500);
      }

      const firstRoomType = Object.keys(roomRatesDetailed)[0];
      const plans = roomRatesDetailed[firstRoomType] || [];
      if (!plans.length) {
        return String(numNights * rooms * 2500);
      }

      // pick first plan with some pricing present
      const plan = plans.find(p => p.dbl != null || p.sgl != null) || plans[0];
      const priceDbl = plan.dbl != null ? Number(plan.dbl) : null;
      const priceSgl = plan.sgl != null ? Number(plan.sgl) : null;
      const priceExtraAdult = plan.extraAdult != null ? Number(plan.extraAdult) : 0;
      const priceExtraChild = plan.extraChild != null ? Number(plan.extraChild) : 0;

      // Capacity baseline: assume 2 adults per room if DBL exists, otherwise 1 adult per room at SGL
      const adultsBaseCapacityPerRoom = priceDbl != null ? 2 : 1;
      const basePerRoom = priceDbl != null ? priceDbl : (priceSgl != null ? priceSgl : 0);

      // Base adults covered by rooms
      const coveredAdults = Math.min(adults, rooms * adultsBaseCapacityPerRoom);
      const extraAdults = Math.max(0, adults - coveredAdults);

      // Base cost = rooms * basePerRoom
      let perNight = rooms * basePerRoom;

      // Add extras
      perNight += extraAdults * priceExtraAdult;
      perNight += children * priceExtraChild;

      const total = perNight * numNights;
      return String(Math.round(total));
    } catch (_) {
      return String((Number(nights) || 1) * (Number(numberOfRooms) || 1) * 2500);
    }
  }
}

module.exports = WhatsAppDataService;
