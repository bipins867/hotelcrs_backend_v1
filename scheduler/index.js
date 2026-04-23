const cron = require('node-cron');
const DailyCheckInBookingReportService = require('../services/DailyCheckInBookingReportService');
const WeeklyUpcomingCheckinsService = require('../services/WeeklyUpcomingCheckinsService');
const BookingConfirmationService = require('../services/BookingConfirmationService');
const TodayBookingReportService = require('../services/TodayBookingReportService');
const DailyCheckInReportService = require('../services/DailyCheckInReportService');
const Next7DaysCheckInReportService = require('../services/Next7DaysCheckInReportService');
const GSTInvoiceService = require('../services/GSTInvoiceService');
const ThankYouStayService = require('../services/ThankYouStayService');
const TomorrowCheckOutReportService = require('../services/TomorrowCheckOutReportService');
const DailyCheckOutReportService = require('../services/DailyCheckOutReportService');
const WeeklyInsightsReportService = require('../services/WeeklyInsightsReportService');
const UpcomingStayService = require('../services/UpcomingStayService');
const CheckInDayReminderService = require('../services/CheckInDayReminderService');
const DailyCheckInBookingReportWhatsAppService = require('../services/DailyCheckInBookingReportWhatsAppService');
const Next7DaysCheckInReportWhatsAppService = require('../services/Next7DaysCheckInReportWhatsAppService');
const TomorrowCheckOutReportWhatsAppService = require('../services/TomorrowCheckOutReportWhatsAppService');
const GuestCheckoutReportService = require('../services/GuestCheckoutReportService');
const GuestCheckoutInvoiceService = require('../services/GuestCheckoutInvoiceService');

let scheduled = false;

function init() {
  if (scheduled) {
    return;
  }

  const tz = process.env.TZ || 'Asia/Kolkata';


  // Daily Check-In & Booking Report: 09:00, 16:00, 23:00 IST
  const dailySchedules = [
    '0 9 * * *',
    '0 16 * * *',
    '0 23 * * *',
  ];
  dailySchedules.forEach((expr, idx) => {
    cron.schedule(expr, async () => {
      try {
        const result = await DailyCheckInBookingReportService.sendForDate(new Date());
        console.log(`Daily check-in & booking report [slot ${idx + 1}] sent:`, result);
      } catch (e) {
        console.error(`Daily report cron [slot ${idx + 1}] failed:`, e.message);
      }
    }, { timezone: tz });
    console.log(`Cron scheduled for Daily Check-In & Booking Report [slot ${idx + 1}]: ${expr} (${tz})`);
  });


  // Weekly 5-day upcoming check-ins (internal), default 09:00 IST daily
  const schedule = '30 9 * * *';
  cron.schedule(schedule, async () => {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    try {
      const result = await WeeklyUpcomingCheckinsService.sendForRange(start, end);
      console.log('5-day upcoming check-ins report sent:', result);
    } catch (e) {
      console.error('5-day upcoming check-ins report failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for 5-day check-in report: ${schedule} (${tz})`);


  // Booking Confirmation Emails: 1 day before check-in at 11 AM, Check-in day at 9 AM
  const bookingConfirmationSchedules = [
    {
      schedule: '0 11 * * *',
      type: 'day_before',
      description: '1 day before check-in'
    },
    {
      schedule: '0 9 * * *',
      type: 'checkin_day',
      description: 'check-in day'
    }
  ];
  bookingConfirmationSchedules.forEach(({ schedule, type, description }) => {
    cron.schedule(schedule, async () => {
      try {
        const result = await BookingConfirmationService.sendBookingConfirmationEmails(type, new Date());
        console.log(`Booking confirmation emails sent for ${description}:`, result);
      } catch (e) {
        console.error(`Booking confirmation cron for ${description} failed:`, e.message);
      }
    }, { timezone: tz });
    console.log(`Cron scheduled for booking confirmation emails (${description}): ${schedule} (${tz})`);
  });

  // Daily Booking Report (bookings created today): 12:30 PM IST by default
  const bookingReportCron = '30 9 * * *';
  cron.schedule(bookingReportCron, async () => {
    try {
      await TodayBookingReportService.sendForDate(new Date());
    } catch (e) {
      console.error('Daily Booking Report failed:', e.message);
    }
  }, { timezone: tz });


  // Daily Check-In Report (check-ins for today): 8:00 AM IST by default
  const checkInReportCron = '0 10 * * *';
  cron.schedule(checkInReportCron, async () => {
    try {
      const result = await DailyCheckInReportService.sendForDate(new Date());
      console.log('Daily Check-In Report sent:', result);
    } catch (e) {
      console.error('Daily Check-In Report failed:', e.message);
    }
  }, { timezone: tz });


  // Next 7 Days Check-In Report: 10:30 AM IST daily
  const next7DaysSchedules = "30 10 * * *";
  cron.schedule(next7DaysSchedules, async () => {
    try {
      const result = await Next7DaysCheckInReportService.sendForDate(new Date());
      console.log('Next 7 Days Check-In Report sent:', result);
    } catch (e) {
      console.error('Next 7 Days Check-In Report failed:', e.message);
    }
  }, { timezone: tz });


  // GST Invoice generation: run daily at 01:00 IST
  const gstSchedule = '0 1 * * *';
  cron.schedule(gstSchedule, async () => {
    try {
      const today = new Date();
      const dateISO = today.toISOString().slice(0, 10);
      const result = await GSTInvoiceService.generateForCheckoutDate(dateISO);
      console.log('GST invoices generated:', result);
    } catch (e) {
      console.error('GST invoice cron failed:', e.message);
    }
  }, { timezone: tz });

  // Thank You Stay Emails: Same-day after checkout at 12:00 PM IST
  const thankYouSameDayCron = '0 12 * * *';
  cron.schedule(thankYouSameDayCron, async () => {
    try {
      const targetDate = new Date();
      const result = await ThankYouStayService.sendForDate(targetDate);
      console.log('Thank you stay emails (same-day) sent:', result);
    } catch (e) {
      console.error('Thank you stay emails (same-day) failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Thank You Stay Emails (same-day after checkout): ${thankYouSameDayCron} (${tz})`);

  // Thank You Stay Emails: 2 days after checkout at 11:00 AM IST
  const thankYouTwoDaysCron = '0 11 * * *';
  cron.schedule(thankYouTwoDaysCron, async () => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 2);
      const result = await ThankYouStayService.sendForDate(targetDate);
      console.log('Thank you stay emails (2-days after) sent:', result);
    } catch (e) {
      console.error('Thank you stay emails (2-days after) failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Thank You Stay Emails (2 days after checkout): ${thankYouTwoDaysCron} (${tz})`);

  // Thank You Stay Emails: 3rd day after checkout at 11:00 AM IST
  const thankYouThirdDayCron = '0 11 * * *';
  cron.schedule(thankYouThirdDayCron, async () => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 3);
      const result = await ThankYouStayService.sendForDate(targetDate);
      console.log('Thank you stay emails (3rd-day after) sent:', result);
    } catch (e) {
      console.error('Thank you stay emails (3rd-day after) failed:', e.message);
    }
  }, { timezone: tz });

  // Thank You Stay WhatsApp: 1, 3, and 7 days after checkout at 11:30 AM IST
  const thankYouWhatsAppCrons = [
    { expr: '0 12 * * *', offset: 1 },
    { expr: '0 13 * * *', offset: 3 },
    { expr: '0 19 * * *', offset: 7 }
  ];
  thankYouWhatsAppCrons.forEach(({ expr, offset }) => {
    cron.schedule(expr, async () => {
      try {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - offset);
        const result = await ThankYouStayService.sendWhatsAppForDate(targetDate);
        console.log(`Thank You Stay WhatsApp (${offset}-day after) sent:`, result);
      } catch (e) {
        console.error(`Thank You Stay WhatsApp (${offset}-day after) failed:`, e.message);
      }
    }, { timezone: tz });
    console.log(`Cron scheduled for Thank You Stay WhatsApp (${offset}-day after): ${expr} (${tz})`);
  });

  // Tomorrow Check-Out Report: 10:00 AM IST daily (1 day before check-out)
  const tomorrowCheckOutCron = '0 10 * * *';
  cron.schedule(tomorrowCheckOutCron, async () => {
    try {
      const result = await TomorrowCheckOutReportService.sendForDate(new Date());
      console.log('Tomorrow Check-Out Report sent:', result);
    } catch (e) {
      console.error('Tomorrow Check-Out Report failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Tomorrow Check-Out Report: ${tomorrowCheckOutCron} (${tz})`);

  // Daily Check-Out Report to Admin: 10:30 AM IST daily (for today's check-outs)
  const dailyCheckOutCron = '30 10 * * *';
  cron.schedule(dailyCheckOutCron, async () => {
    try {
      const result = await DailyCheckOutReportService.sendForDate(new Date());
      console.log('Daily Check-Out Report sent:', result);
    } catch (e) {
      console.error('Daily Check-Out Report failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Daily Check-Out Report: ${dailyCheckOutCron} (${tz})`);

  // Weekly Insights Report: Every Monday at 11:30 AM IST
  const weeklyInsightsCron = '30 11 * * 1';
  cron.schedule(weeklyInsightsCron, async () => {
    try {
      const result = await WeeklyInsightsReportService.sendForDate(new Date());
      console.log('Weekly Insights Report sent:', result);
    } catch (e) {
      console.error('Weekly Insights Report failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Weekly Insights Report: ${weeklyInsightsCron} (${tz})`);

  // Upcoming Stay Reminder Emails for Guests
  // 1) 1 day before Check-In at 11:00 AM IST (next-day check-ins)
  const upcomingStayDayBeforeCron = '0 11 * * *';
  cron.schedule(upcomingStayDayBeforeCron, async () => {
    try {
      const result = await UpcomingStayService.sendForDate(new Date());
      console.log('Upcoming Stay Reminder emails (1 day before) sent:', result);
    } catch (e) {
      console.error('Upcoming Stay Reminder emails (1 day before) failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Upcoming Stay Reminder Emails (1 day before): ${upcomingStayDayBeforeCron} (${tz})`);

  // 2) Check-In Date at 9:00 AM IST (today's check-ins)
  // Reuse the same service by passing yesterday as targetDate so it selects today's check-ins
  const upcomingStayCheckinDayCron = '0 9 * * *';
  cron.schedule(upcomingStayCheckinDayCron, async () => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1); // so fetchTomorrowCheckins(targetDate) => today
      const result = await UpcomingStayService.sendForDate(targetDate);
      console.log('Upcoming Stay Reminder emails (check-in day) sent:', result);
    } catch (e) {
      console.error('Upcoming Stay Reminder emails (check-in day) failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Upcoming Stay Reminder Emails (check-in day): ${upcomingStayCheckinDayCron} (${tz})`);

  // Check-In Day WhatsApp Reminders: 8 AM, 12 PM, and 2 PM IST daily (for today's check-ins)
  const checkInDayReminderSchedules = [
    { expr: '0 8 * * *', time: '8:00 AM' },
    { expr: '0 12 * * *', time: '12:00 PM' },
    { expr: '0 14 * * *', time: '2:00 PM' }
  ];
  checkInDayReminderSchedules.forEach(({ expr, time }) => {
    cron.schedule(expr, async () => {
      try {
        const result = await CheckInDayReminderService.sendForDate(new Date());
        console.log(`Check-In Day WhatsApp Reminder (${time}) sent:`, result);
      } catch (e) {
        console.error(`Check-In Day WhatsApp Reminder (${time}) failed:`, e.message);
      }
    }, { timezone: tz });
    console.log(`Cron scheduled for Check-In Day WhatsApp Reminder (${time}): ${expr} (${tz})`);
  });

  // Daily Check-In & Booking Report WhatsApp to Hotels: 9 AM, 6 PM, and 11 PM IST
  const dailyReportWhatsAppSchedules = [
    { expr: '0 9 * * *', time: '9:00 AM' },
    { expr: '0 18 * * *', time: '6:00 PM' },
    { expr: '0 23 * * *', time: '11:00 PM' }
  ];
  dailyReportWhatsAppSchedules.forEach(({ expr, time }) => {
    cron.schedule(expr, async () => {
      try {
        const result = await DailyCheckInBookingReportWhatsAppService.sendForDate(new Date());
        console.log(`Daily Check-In & Booking Report WhatsApp (${time}) sent:`, result);
      } catch (e) {
        console.error(`Daily Check-In & Booking Report WhatsApp (${time}) failed:`, e.message);
      }
    }, { timezone: tz });
    console.log(`Cron scheduled for Daily Check-In & Booking Report WhatsApp (${time}): ${expr} (${tz})`);
  });

  // Next 7 Days Check-In Report WhatsApp to Hotels: 9 AM, 6 PM, and 11 PM IST
  const next7DaysReportWhatsAppSchedules = [
    { expr: '0 9 * * *', time: '9:00 AM' },
    { expr: '0 18 * * *', time: '6:00 PM' },
    { expr: '0 23 * * *', time: '11:00 PM' }
  ];
  next7DaysReportWhatsAppSchedules.forEach(({ expr, time }) => {
    cron.schedule(expr, async () => {
      try {
        const result = await Next7DaysCheckInReportWhatsAppService.sendForDate(new Date());
        console.log(`Next 7 Days Check-In Report WhatsApp (${time}) sent:`, result);
      } catch (e) {
        console.error(`Next 7 Days Check-In Report WhatsApp (${time}) failed:`, e.message);
      }
    }, { timezone: tz });
    console.log(`Cron scheduled for Next 7 Days Check-In Report WhatsApp (${time}): ${expr} (${tz})`);
  });

  // Tomorrow Check-Out Report WhatsApp to Hotels: 11:30 PM IST daily
  const tomorrowCheckOutReportWhatsAppCron = '30 23 * * *';
  cron.schedule(tomorrowCheckOutReportWhatsAppCron, async () => {
    try {
      const result = await TomorrowCheckOutReportWhatsAppService.sendForDate(new Date());
      console.log('Tomorrow Check-Out Report WhatsApp sent:', result);
    } catch (e) {
      console.error('Tomorrow Check-Out Report WhatsApp failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Tomorrow Check-Out Report WhatsApp: ${tomorrowCheckOutReportWhatsAppCron} (${tz})`);

  // Guest Checkout Report & Invoices to Hotels: 6:00 AM IST daily (for checkouts that occurred on the target date)
  const guestCheckoutReportCron = '0 6 * * *';
  cron.schedule(guestCheckoutReportCron, async () => {
    try {
      // Send report for yesterday's checkouts (since 6 AM is early morning, previous day's checkouts are complete)
      const targetDate = new Date();
      const result = await GuestCheckoutReportService.sendForDate(targetDate);
      if (result.skipped) {
        console.log('Guest Checkout Report & Invoices skipped: No checkouts found');
      } else {
        console.log(`Guest Checkout Report & Invoices sent: ${result.sent} hotels, ${result.failed?.length || 0} failed`);
      }
    } catch (e) {
      console.error('Guest Checkout Report & Invoices failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Guest Checkout Report & Invoices: ${guestCheckoutReportCron} (${tz})`);

  // Guest Checkout Invoice Emails to Guests: 12:30 PM IST daily (for checkouts that occurred on the target date)
  const guestCheckoutInvoiceCron = '30 12 * * *';
  cron.schedule(guestCheckoutInvoiceCron, async () => {
    try {
      const targetDate = new Date();
      const result = await GuestCheckoutInvoiceService.sendForDate(targetDate);
      if (result.skipped) {
        console.log('Guest Checkout Invoice Emails skipped: No checkouts found');
      } else {
        console.log(`Guest Checkout Invoice Emails sent: ${result.sent} guests, ${result.failed?.length || 0} failed`);
      }
    } catch (e) {
      console.error('Guest Checkout Invoice Emails failed:', e.message);
    }
  }, { timezone: tz });
  console.log(`Cron scheduled for Guest Checkout Invoice Emails: ${guestCheckoutInvoiceCron} (${tz})`);

  scheduled = true;
}

module.exports = {
  init,
};


