export const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-indexed
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}/${month}/${day}`;
};

export const getDateRange = (startDate, endDate) => {
  const dates = [];
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-indexed
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  while (currentDate <= end) {
    dates.push(formatDate(new Date(currentDate))); // Format the date as yyyy-mm-dd
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const createBookingId = async (reservation) => {
  const reservationData = reservation?.toJson ? reservation.toJson() : reservation;

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const sequence = String(reservationData.id).padStart(5, '0');
  const bookingId = `W${day}${month}${year}${sequence}`;
  return bookingId;
}

export const fetchAssignHotelId = (userDetails) => {
  if (userDetails?.userType?.toLowerCase() === "hotel") {
    return userDetails?.assignedHotelId.map((hotelId) => Number(hotelId));
  }
  return null;
}