const { getGstRate } = require("../helper/reservation");
const TemplateHelper = require("./templateHelper");
const { parseISO, addDays } = require("date-fns");

exports.fetchGstDetails = (reservation, companyDetails) => {
    const { bookingDetails, checkingDate } = reservation;

    if (!Array.isArray(bookingDetails) || !checkingDate) {
        return { rows: [], grandTotalBaseRate: 0, grandTotalGst: 0 };
    }

    let totalBase = 0;
    let totalGst = 0;
    const allRows = [];
    const startDate = typeof checkingDate === 'string' ? parseISO(checkingDate) : new Date(checkingDate);

    bookingDetails.forEach((booking) => {
        const roomName = booking?.rooms?.roomName || "N/A";
        const baseRates = booking?.baseRate || [];
        for (i = 0; i < baseRates.length; i++) {
            const rate = baseRates[i];
            const baseRate = Number(rate || 0);
            if (!baseRate || typeof baseRate !== 'number') return;
            const gstRate = getGstRate(companyDetails, baseRate);
            const gstAmount = baseRate * (Number(gstRate) / 100);
            const nightDate = addDays(startDate, i);

            totalBase += baseRate;
            totalGst += Number(gstAmount || 0);

            allRows.push({
                date: TemplateHelper.formatDate(nightDate, "d-MMM-yy"),
                roomType: roomName,
                baseRate,
                gst: gstAmount,
            });
        };
    });

    return {
        rows: allRows,
        grandTotalBaseRate: totalBase,
        grandTotalGst: totalGst,
    };
};

exports.paymentSummary = (
    commission = {},
    companyDetails = {},
    grandTotalBaseRate = 0,
    grandTotalGst = 0
) => {
    const b2cCommissionPct = Number(commission?.b2cCommission) || 0;
    const gstOnCommissionPct = Number(companyDetails?.gstOnCommissionByOTA) || 0;
    const tcsPct = Number(companyDetails?.tcsDeductionByOTA) || 0;
    const tdsPct = Number(companyDetails?.tdsDeductionByOTA) || 0;

    const otaCommissionAmt = grandTotalBaseRate * (b2cCommissionPct / 100);
    const gstOnCommissionAmt = otaCommissionAmt * (gstOnCommissionPct / 100);
    const tcsAmt = grandTotalBaseRate * (tcsPct / 100);
    const tdsAmt = grandTotalBaseRate * (tdsPct / 100);

    const totalDeduction =
        otaCommissionAmt + gstOnCommissionAmt + tcsAmt + tdsAmt;

    const balanceAmount = grandTotalBaseRate - totalDeduction;
    const finalPaid = balanceAmount + grandTotalGst;

    return {
        b2cCommissionPct,
        gstOnCommissionPct,
        tcsPct,
        tdsPct,
        otaCommissionAmt,
        gstOnCommissionAmt,
        tcsAmt,
        tdsAmt,
        totalDeduction,
        balanceAmount,
        finalPaid,
    };
};