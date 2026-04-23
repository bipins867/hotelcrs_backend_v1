/**
 * Permission Constants
 * All permissions are defined in the format: section:action
 * Actions: view, create, edit, delete
 */

const PERMISSIONS = {
    // ==================== Site Management ====================
    RATE_PLAN: {
        permissions: [
            'rate_plan:view',
            'rate_plan:create',
            'rate_plan:edit',
            'rate_plan:delete'
        ],
        title: 'Rate Plan'
    },
    COUNTRY: {
        permissions: [
            'country:view',
            'country:create',
            'country:edit',
            'country:delete'
        ],
        title: 'Country'
    },
    STATE: {
        permissions: [
            'state:view',
            'state:create',
            'state:edit',
            'state:delete'
        ],
        title: 'State'
    },
    CITY: {
        permissions: [
            'city:view',
            'city:create',
            'city:edit',
            'city:delete'
        ],
        title: 'City'
    },
    LOCATION: {
        permissions: [
            'location:view',
            'location:create',
            'location:edit',
            'location:delete'
        ],
        title: 'Location'
    },
    PAYMENT_TYPE: {
        permissions: [
            'payment_type:view',
            'payment_type:create',
            'payment_type:edit',
            'payment_type:delete'
        ],
        title: 'Payment Type'
    },
    CUSTOMER: {
        permissions: [
            'customer:view',
            'customer:create',
            'customer:edit',
            'customer:delete'
        ],
        title: 'Customer'
    },
    COMMISSION: {
        permissions: [
            'commission:view',
            'commission:create',
            'commission:edit',
            'commission:delete'
        ],
        title: 'Commission'
    },
    TRAVEL_PARTNERS: {
        permissions: [
            'travel_partners:view',
            'travel_partners:create',
            'travel_partners:edit',
            'travel_partners:delete'
        ],
        title: 'Travel Partners'
    },
    COMPANY_DETAILS: {
        permissions: [
            'company_details:view',
            'company_details:create',
            'company_details:edit',
            'company_details:delete'
        ],
        title: 'Company Details'
    },
    INCLUSION: {
        permissions: [
            'inclusion:view',
            'inclusion:create',
            'inclusion:edit',
            'inclusion:delete'
        ],
        title: 'Inclusion'
    },
    DOCUMENT: {
        permissions: [
            'document:view',
            'document:create',
            'document:edit',
            'document:delete',
            'document:download',
        ],
        title: 'Document'
    },
    // ==================== Hotel Management ====================
    HOTEL: {
        permissions: [
            'hotel:view',
            'hotel:create',
            'hotel:edit',
            'hotel:delete'
        ],
        title: 'Hotel Management'
    },

    // ==================== Room Rate Management ====================
    RATE: {
        permissions: [
            'rate:view',
            'rate:create',
            'rate:edit',
            'rate:delete'
        ],
        title: 'Rate Management'
    },

    // ==================== Reservation Management ====================
    RESERVATION: {
        permissions: [
            'reservation:view',
            'reservation:create',
            'reservation:edit',
            'reservation:delete',
            'reservation:cancel',
            'reservation:export',
            'reservation:hotel_voucher',
            'reservation:customer_voucher',
            'reservation:admin_voucher',
            'reservation:print_invoice',
            'reservation:send_invoice',
            'reservation:send_email'
        ],
        title: 'Reservation Management'
    },

    // ==================== Payment Management ====================
    PAYMENT: {
        permissions: [
            'payment:view',
            'payment:create',
            'payment:edit',
            'payment:delete',
            'payment:receipt',
            'payment:send_email'
        ],
        title: 'Payment Management'
    },

    // ==================== GST Management ====================
    GST: {
        permissions: [
            'gst:view',
            'gst:create',
            'gst:edit',
            'gst:delete',
            'gst:regenerate'
        ],
        title: 'GST Management'
    },

    // ==================== Expense Management ====================
    EXPENSE: {
        permissions: [
            'expense:view',
            'expense:create',
            'expense:edit',
            'expense:delete',
            'expense:export'
        ],
        title: 'Expense Management'
    },

    // ==================== Bank Management ====================
    BANK: {
        permissions: [
            'bank:view',
            'bank:create',
            'bank:edit',
            'bank:delete',
            'bank:export'
        ],
        title: 'Bank Management'
    },

    // ==================== OTA Management ====================
    OTA: {
        permissions: [
            'ota:view',
            'ota:create',
            'ota:edit',
            'ota:delete'
        ],
        title: 'OTA Management'
    },

    // ==================== User Management ====================
    CRS_USERS: {
        permissions: [
            'crs_users:view',
            'crs_users:create',
            'crs_users:edit',
            'crs_users:delete'
        ],
        title: 'CRS User Management'
    },

    HOTEL_USERS: {
        permissions: [
            'hotel_users:view',
            'hotel_users:create',
            'hotel_users:edit',
            'hotel_users:delete'
        ],
        title: 'Hotel User Management'
    },
    // ==================== Inquiry Management ====================
    INQUIRY: {
        permissions: [
            'inquiry:view',
            'inquiry:create',
            'inquiry:edit',
            'inquiry:delete',
            'inquiry:resend_email',
            'inquiry:resend_whatsapp',
            'inquiry:send_both'
        ],
        title: 'Inquiry Management'
    },

    // ==================== Role Management ====================
    ROLE: {
        permissions: [
            'role:view',
            'role:create',
            'role:edit',
            'role:delete'
        ],
        title: 'Role Management'
    },

    // ==================== Hotel Invoices Management ====================
    HOTEL_INVOICES: {
        permissions: [
            'hotel_invoices:view',
            'hotel_invoices:create',
            'hotel_invoices:edit',
            'hotel_invoices:delete'
        ],
        title: 'Hotel Invoices Management'
    },
};

/**
 * Get all permissions as a flat array
 * @returns {Array} Array of all permission strings
 */
function getAllPermissions() {
    const permissions = [];
    Object.values(PERMISSIONS).forEach(section => {
        Object.values(section.permissions).forEach(permission => {
            permissions.push(permission);
        });
    });
    return permissions;
}

/**
 * Get permissions by section name
 * @param {String} sectionName - Name of the section (e.g., 'HOTEL', 'RESERVATIONS')
 * @returns {Array} Array of permission strings for the section
 */
function getPermissionsBySection(sectionName) {
    const section = PERMISSIONS[sectionName];
    if (!section) return [];
    return Object.values(section.permissions);
}

/**
 * Get all section names
 * @returns {Array} Array of section names
 */
function getAllSections() {
    return Object.values(PERMISSIONS).map(section => section.title);
}

module.exports = {
    PERMISSIONS,
    getAllPermissions,
    getPermissionsBySection,
    getAllSections
};

