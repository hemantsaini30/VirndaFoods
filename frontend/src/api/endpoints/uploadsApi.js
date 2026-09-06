import axios from 'axios';
import axiosClient from '../axiosClient';

// Step 1: ask our backend for a signed upload authorization.
function getUploadSignature() {
  return axiosClient.post('/uploads/signature');
}

// Step 2: upload the actual file DIRECTLY to Cloudinary using that
// signature — this request does NOT go through our backend/axiosClient
// (different base URL, no auth header needed, no credentials cookie), so
// it uses a plain axios call instead.
async function uploadImage(file) {
  const { data: sig } = await getUploadSignature();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', sig.timestamp);
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
  const res = await axios.post(uploadUrl, formData);

  return res.data.secure_url; // the URL to store as imageUrl
}

export default { getUploadSignature, uploadImage };