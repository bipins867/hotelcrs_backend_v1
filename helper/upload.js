require("dotenv").config();

exports.getFileBucketName = (key = '') => {
    switch (key) {
        case 'GST_INVOICE':
            return process.env.AWS_TAX_BUCKET_NAME;
        default:
            return process.env.AWS_BUCKET_NAME;
    }
}