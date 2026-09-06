const cloudinary = require('../../config/cloudinary');
const env = require('../../config/env');

// Generates a short-lived signature the frontend uses to upload DIRECTLY
// to Cloudinary from the browser — our backend never receives or handles
// the actual image bytes. See the tradeoff note in this phase's summary:
// this keeps our server simple (no multipart parsing, no temp files, no
// bandwidth spent proxying images) at the cost of the frontend needing a
// few extra lines to call Cloudinary's upload API itself using the values
// this endpoint returns.
//
// The signature is time-boxed (Cloudinary computes it over `timestamp`
// plus any other params we choose to sign) and single-use in practice —
// it's a signed authorization to perform ONE upload with THESE exact
// params, not a reusable credential. CLOUDINARY_API_SECRET itself never
// leaves the server.
function getUploadSignature(req, res, next) {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
      timestamp,
      folder: env.CLOUDINARY_UPLOAD_FOLDER,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      env.CLOUDINARY_API_SECRET
    );

    res.status(200).json({
      signature,
      timestamp,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      folder: env.CLOUDINARY_UPLOAD_FOLDER,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUploadSignature };