const { CompanyDetails } = require('../../db/models');
const { errorResponse, successResponse } = require('../../utils/responseHelper');
const { getSignedUrl } = require('../../utils/s3Helper');

let resourceName = 'Company Details';

exports.findCompanyDetails = async (req, res) => {
  try {
    const companyDetails = await CompanyDetails.findAll();
    const companyDetailsData = companyDetails?.length > 0 ? companyDetails[0].toJSON() : null;

    if (companyDetailsData) {
      const signatureImage = await getSignedUrl(companyDetailsData?.signatureImage);
      companyDetailsData.signatureImageUrl = signatureImage;

      const companyLogo = await getSignedUrl(companyDetailsData?.companyLogo);
      companyDetailsData.companyLogoUrl = companyLogo;
    }

    return successResponse(res, 'Company details retrieved successfully', companyDetailsData);
  } catch (error) {
    return errorResponse(res, `Error fetching ${resourceName}`, error);
  }
}

exports.create = async (req, res) => {
  try {
    const {
      companyName,
      address,
      emails,
      phones,
      panNo,
      companyRegistrationNo,
      hsnSacCode,
      tanNo,
      companyLogo,
      signatureImage,
      gstPercentageLessThan7500,
      gstPercentageGreaterThan7500,
      bankDetails,
      gstOnCommissionByOTA,
      tcsDeductionByOTA,
      tdsDeductionByOTA
    } = req.body;

    const companyRes = await CompanyDetails.findOne();
    let companyDetails;

    if (companyRes) {
      companyDetails = await companyRes.update({
        companyName,
        companyLogo,
        signatureImage,
        address,
        emails,
        phones,
        panNo,
        companyRegistrationNo,
        hsnSacCode,
        tanNo,
        gstPercentageLessThan7500,
        gstPercentageGreaterThan7500,
        bankDetails,
        gstOnCommissionByOTA,
        tcsDeductionByOTA,
        tdsDeductionByOTA
      }, {
        userId: req.user.id,
        req: req
      })
    } else {
      companyDetails = await CompanyDetails.create({
        companyName,
        companyLogo,
        signatureImage,
        address,
        emails,
        phones,
        panNo,
        companyRegistrationNo,
        hsnSacCode,
        tanNo,
        gstPercentageLessThan7500,
        gstPercentageGreaterThan7500,
        bankDetails,
        gstOnCommissionByOTA,
        tcsDeductionByOTA,
        tdsDeductionByOTA
      }, {
        userId: req.user.id,
        req: req
      })
    }

    return successResponse(res, 'Company details added successfully', companyDetails);
  } catch (error) {
    return errorResponse(res, `Error creating ${resourceName}`, error.message);
  }
};