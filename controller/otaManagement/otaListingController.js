const { successResponse, errorResponse } = require('../../utils/responseHelper');
const { OtaListing, Hotel, City, State, Country } = require('../../db/models');
const { generateOtaListingExcelReport } = require('../../utils/otaListingExcelHelper');
const { buildWhereClause } = require('../../helper/filter');
const { Op } = require('sequelize');
const { getSignedUrl } = require('../../utils/s3Helper');

let resourceName = 'OTA Listing';

module.exports = {
    getAll: async (req, res) => {
        try {
            const otaListings = await OtaListing.findAll({
                include: [{
                    model: Hotel,
                    as: 'hotel',
                    attributes: ['id', 'name', 'address', 'cityId', 'stateId', 'countryId']
                }]
            });
            successResponse(res, `${resourceName} fetched successfully`, otaListings);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    findAndCountAll: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                orderBy = 'DESC',
            } = req.query;

            const offset = (page - 1) * limit;

            const filterConfig = {
                otaName: 'like',
                status: 'exact',
                liveStatus: 'exact',
                healthAnalysis: 'exact',
                listedBy: 'like'
            };

            const where = buildWhereClause(req.query, filterConfig);

            const hotelWhere = buildWhereClause({ name: req.query?.hotelName }, { name: 'like' });

            const { rows: otaListings, count: totalRecords } = await OtaListing.findAndCountAll({
                where,
                offset: +offset,
                limit: +limit,
                order: [['createdAt', orderBy]],
                include: [{
                    model: Hotel,
                    as: 'hotel',
                    attributes: ['id', 'name', 'address', 'cityId', 'stateId', 'countryId'],
                    include: [
                        { model: City, as: 'city', attributes: ['id', 'name'] },
                        { model: State, as: 'state', attributes: ['id', 'name'] },
                        { model: Country, as: 'country', attributes: ['id', 'name'] },
                    ],
                    where: hotelWhere
                }]
            });

            const totalPages = Math.ceil(totalRecords / limit);

            successResponse(res, `${resourceName} fetched successfully`, {
                otaListings,
                totalRecords,
                totalPages,
                currentPage: page,
            });
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    create: async (req, res) => {
        try {
            const {
                otaName,
                famousIn,
                status,
                listingDate,
                listedBy,
                healthAnalysis,
                liveStatus,
                listingUrl,
                hotelId,
                fileUrl
            } = req.body;
            const createdBy = req.user ? req.user.id : null;

            const existingListing = await OtaListing.findOne({
                where: {
                    otaName,
                    hotelId,
                    deletedAt: null
                }
            });

            if (existingListing) {
                return errorResponse(res, `OTA listing for ${otaName} already exists`, null, 409);
            }

            const newOtaListing = await OtaListing.create({
                otaName,
                famousIn,
                status,
                listingDate,
                listedBy,
                healthAnalysis,
                liveStatus,
                listingUrl,
                hotelId,
                fileUrl,
                createdBy
            }, {
                userId: createdBy,
                req: req
            });

            const createdListing = await OtaListing.findByPk(newOtaListing.id);

            successResponse(res, `${resourceName} created successfully`, createdListing, 201);
        } catch (error) {
            console.log(error, 'Error creating OTA listing');
            errorResponse(res, `Error creating ${resourceName}`, error.message);
        }
    },

    findById: async (req, res) => {
        try {
            const { id } = req.params;
            const otaListing = await OtaListing.findByPk(id, {
                include: [{
                    model: Hotel,
                    as: 'hotel',
                    attributes: ['id', 'name', 'address', 'cityId', 'stateId', 'countryId']
                }]
            });
            if (!otaListing) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }
            successResponse(res, `${resourceName} fetched successfully`, otaListing);
        } catch (error) {
            errorResponse(res, `Error fetching ${resourceName}`, error.message);
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                otaName,
                famousIn,
                status,
                listingDate,
                listedBy,
                healthAnalysis,
                liveStatus,
                listingUrl,
                hotelId,
                fileUrl
            } = req.body;
            const updatedBy = req.user ? req.user.id : null;

            const otaListing = await OtaListing.findByPk(id);
            if (!otaListing) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            if ((otaName && otaName !== otaListing.otaName) || (hotelId && hotelId !== otaListing.hotelId)) {
                const existingListing = await OtaListing.findOne({
                    where: {
                        otaName: otaName || otaListing.otaName,
                        hotelId: hotelId || otaListing.hotelId,
                        id: { [Op.ne]: id },
                        deletedAt: null
                    }
                });

                if (existingListing) {
                    return errorResponse(res, `OTA listing for ${otaName || otaListing.otaName} already exists for this hotel`, null, 409);
                }
            }

            const updatedData = {
                otaName: otaName,
                famousIn: famousIn,
                status: status,
                listingDate: listingDate,
                listedBy: listedBy,
                healthAnalysis: healthAnalysis,
                liveStatus: liveStatus,
                listingUrl: listingUrl,
                hotelId: hotelId,
                fileUrl: fileUrl,
                updatedBy,
            };

            await otaListing.update(updatedData, {
                userId: updatedBy,
                req: req
            });


            const updatedListing = await OtaListing.findByPk(id);

            successResponse(res, `${resourceName} updated successfully`, updatedListing);
        } catch (error) {
            errorResponse(res, `Error updating ${resourceName}`, error.message);
        }
    },

    delete: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedBy = req.user ? req.user.id : null;

            const otaListingExist = await OtaListing.findByPk(id);
            if (!otaListingExist) {
                return errorResponse(res, `${resourceName} not found`, null, 404);
            }

            await OtaListing.destroy({
                where: { id },
                userId: deletedBy,
                req: req
            });

            successResponse(res, `${resourceName} deleted successfully`);
        } catch (error) {
            errorResponse(res, `Error deleting ${resourceName}`, error.message);
        }
    },

    exportToExcel: async (req, res) => {
        try {
            const filterConfig = {
                otaName: 'like',
                status: 'exact',
                liveStatus: 'exact',
                healthAnalysis: 'exact',
                listedBy: 'like'
            };

            const where = buildWhereClause(req.query, filterConfig);
            const hotelWhere = buildWhereClause({ name: req.query?.hotelName }, { name: 'like' });

            const otaListings = await OtaListing.findAll({
                where,
                include: [{
                    model: Hotel,
                    as: 'hotel',
                    attributes: ['id', 'name', 'address', 'cityId', 'stateId', 'countryId'],
                    include: [
                        { model: City, as: 'city', attributes: ['id', 'name'] },
                        { model: State, as: 'state', attributes: ['id', 'name'] },
                        { model: Country, as: 'country', attributes: ['id', 'name'] },
                    ],
                    where: hotelWhere
                }],
                order: [['createdAt', 'DESC']]
            });

            if (!otaListings || otaListings.length === 0) {
                return errorResponse(res, 'No OTA listings found for the specified criteria', null, 404);
            }

            const workbook = await generateOtaListingExcelReport(otaListings);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `ota_listings_${timestamp}.xlsx`;

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            await workbook.xlsx.write(res);
            res.end();
        } catch (error) {
            console.error('OTA listings export error:', error);
            return errorResponse(res, 'Error generating OTA listings report', error.message);
        }
    },

    downloadFile: async (req, res) => {
        try {
            const { id } = req.params;
            const otaListing = await OtaListing.findByPk(id);
            if (!otaListing) {
                return errorResponse(res, 'OTA listing not found', null, 404);
            }
            let fileUrl = otaListing.fileUrl;
            if (!fileUrl) {
                return errorResponse(res, 'File URL not found for this OTA listing', null, 400);
            }

            if (Array.isArray(fileUrl)) {
                fileUrl = fileUrl[0];
            }

            const url = getSignedUrl(fileUrl, 'getObject', 60 * 10);

            successResponse(res, `Fetched file successfully`, { url });

        } catch (error) {
            console.error('Error downloading OTA listing file:', error);
            return errorResponse(res, 'Error downloading OTA listing file', error.message);
        }
    }
};
