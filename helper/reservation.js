exports.bindReservationData = async (reservation) => {
    const raw = reservation?.toJSON ? reservation.toJSON() : reservation;
    const result = {
        ...raw,
        bookingDetails: (raw?.bookingDetails || []).map((booking) => {
            const oldBooking = raw?.oldData?.bookingDetails?.find((b) => b.id === booking.id) || {};
            return {
                ...booking,
                rooms: oldBooking?.rooms || booking?.rooms,
                ratePlans: oldBooking?.ratePlans || booking?.ratePlans,
            };
        }),
        customers: raw?.oldData?.customers || raw?.customers,
        hotels: raw?.oldData?.hotels || raw?.hotels,
        paymentTypes: raw?.oldData?.paymentTypes || raw?.paymentTypes,
        travelPartner: raw?.oldData?.travelPartner || raw?.travelPartner,
        companyDetails: raw?.oldData?.companyDetails || raw?.companyDetails,
    };
    return result || {};
}

exports.groupHotels = async (reservtion) => {
    const result = reservtion.map((row, i, self) => {
        const hotels = row?.hotels;
        if (self.find((h) => h?.hotels?.id === hotels?.id)) return hotels;
    });
    return result || [];
}

exports.groupHotelsByHotelId = async (reservation) => {
    const map = new Map();
    for (const r of reservation) {
        const hotelId = r?.hotels?.id;
        if (!map.has(hotelId)) map.set(hotelId, []);
        map.get(hotelId).push(await this.bindReservationData(r));
    }
    return map;
}

exports.getGstRate = (companyDetails, amount) => {
    if (Number(amount) <= 7500) {
        return Number(companyDetails?.gstPercentageLessThan7500);
    }
    return Number(companyDetails?.gstPercentageGreaterThan7500);
}

exports.getGstAmount = (companyDetails, amount) => {
    const gstRate = this.getGstRate(companyDetails, amount);
    return Number(amount) / 100 * gstRate;
}