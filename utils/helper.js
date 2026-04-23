export const numberToWords = (num) => {
  num = Number(num);

  if (isNaN(num) || num < 0) return "invalid number";
  if (num === 0) return "zero";

  const ones = [
    "", "one", "two", "three", "four",
    "five", "six", "seven", "eight", "nine"
  ];

  const teens = [
    "ten", "eleven", "twelve", "thirteen", "fourteen",
    "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
  ];

  const tens = [
    "", "", "twenty", "thirty", "forty",
    "fifty", "sixty", "seventy", "eighty", "ninety"
  ];

  const convertBelowThousand = (n) => {
    let str = "";

    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " hundred";
      n %= 100;
      if (n > 0) str += " and ";
    }

    if (n >= 20) {
      str += tens[Math.floor(n / 10)];
      if (n % 10) str += " " + ones[n % 10];
    } else if (n >= 10) {
      str += teens[n - 10];
    } else if (n > 0) {
      str += ones[n];
    }

    return str.trim();
  };

  // MAIN LOGIC
  let result = "";

  const crore = Math.floor(num / 10000000);
  if (crore > 0) {
    result += convertBelowThousand(crore) + " crore ";
    num %= 10000000;
  }

  const lakh = Math.floor(num / 100000);
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + " lakh ";
    num %= 100000;
  }

  const thousand = Math.floor(num / 1000);
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + " thousand ";
    num %= 1000;
  }

  if (num > 0) {
    result += convertBelowThousand(num);
  }

  result = result.trim();
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();

};

export const PAYMENT_TYPE_OPTIONS = {
  DIRECT_PAYMENT: "Direct Payment",
  ADVANCE_PAYMENT: "Advance Payment",
  BILL_TO_COMPANY: "Bill To Company (BTC)",
  COMPLIMENTARY_TO_HOTEL: "Complimentary to Hotel",
  COMPLIMENTARY_TO_COMPANY: "Complimentary to Company",
  DIRECT_BILL_TO_COMPANY: "Direct and Bill To Company (BTC)",
  PLB_BOOKING: "PLB Booking",
  OTA_TO_PAY_HOTEL_DIRECTLY: "OTA to Pay Hotel Directly",
  CANCELLED_BOOKING: "Cancelled Booking",
  NO_SHOW_BOOKING: "No-Show Booking",
  PAYMENT_FORFETE: "PAYMENT FORFEITED",
};

export const RESERVATION_STATUS_OPTIONS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancel",
  NO_SHOW: "No Show",
  PAYMENT_FORFETE: "Payment Forfeted",
  MODIFIED: "Modified",
};