// ================================
// IMAGE UPLOAD — CLOUDINARY (CLOUDIFY)
// ================================

const CLOUDIFY_CONFIG = {
    cloudName: 'djj8ik8i5',            // Provided by USER
    uploadPreset: 'backdoor'           // Assuming 'backdoor' works
};

// ================================
// MAIN UPLOAD FUNCTION
// ================================
export async function cloudifyUpload(file, preset = 'backdoor') {
    if (!file) return null;

    const uploadPreset = CLOUDIFY_CONFIG.uploadPreset !== 'YOUR_UPLOAD_PRESET' ? CLOUDIFY_CONFIG.uploadPreset : preset;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'backdoor/products');

    try {
        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDIFY_CONFIG.cloudName}/image/upload`,
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
        console.error('Cloudify upload error:', err);
        throw err;
    }
}
