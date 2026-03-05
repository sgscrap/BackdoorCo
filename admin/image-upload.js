// ================================
// IMAGE UPLOAD — CLOUDINARY
// ================================

const CLOUDINARY_CONFIG = {
    cloudName: 'djj8ik8i5',            // Provided by USER
    uploadPreset: 'backdoor'           // Assuming 'backdoor' works, or I'll leave 'YOUR_UPLOAD_PRESET' if they need to change it
};

const IMGBB_CONFIG = {
    apiKey: 'YOUR_IMGBB_API_KEY'       // Not currently used as it defaults to cloudinary
};

// Choose your route
const IMAGE_ROUTE = 'cloudinary';
// options: 'cloudinary' | 'imgbb' | 'url'

// ================================
// MAIN UPLOAD FUNCTION
// ================================
export async function uploadImage(file, preset = 'backdoor') {
    if (!file) return null;

    switch (IMAGE_ROUTE) {
        case 'cloudinary':
            return await uploadToCloudinary(file, preset);
        case 'imgbb':
            return await uploadToImgBB(file);
        default:
            return null;
    }
}

// ================================
// CLOUDINARY UPLOAD
// ================================
async function uploadToCloudinary(file, presetName = 'ml_default') {
    // We try the common default preset first, or whatever the user set
    const uploadPreset = CLOUDINARY_CONFIG.uploadPreset !== 'YOUR_UPLOAD_PRESET' ? CLOUDINARY_CONFIG.uploadPreset : presetName;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'backdoor/products');

    try {
        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        const data = await res.json();

        if (data.secure_url) {
            return data.secure_url;
        } else {
            throw new Error(data.error?.message ||
                'Upload failed');
        }
    } catch (err) {
        console.error('Cloudinary upload error:', err);
        throw err;
    }
}

// ================================
// IMGBB UPLOAD
// ================================
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const res = await fetch(
            `https://api.imgbb.com/1/upload?key=${IMGBB_CONFIG.apiKey}`,
            {
                method: 'POST',
                body: formData
            }
        );

        const data = await res.json();

        if (data.success) {
            return data.data.url;
        } else {
            throw new Error('ImgBB upload failed');
        }
    } catch (err) {
        console.error('ImgBB upload error:', err);
        throw err;
    }
}
