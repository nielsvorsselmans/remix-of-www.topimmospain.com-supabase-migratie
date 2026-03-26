import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  // For larger files (>5MB), use more aggressive compression
  const isLargeFile = file.size > 5 * 1024 * 1024;
  
  const options = {
    maxSizeMB: 0.4, // 400KB target for better compression
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: isLargeFile ? 0.7 : 0.8, // Lower quality for large files
  };

  try {
    let compressedFile = await imageCompression(file, options);
    
    // If still too large (>800KB), compress again with lower quality
    if (compressedFile.size > 800 * 1024) {
      console.log('File still large, applying second compression pass');
      compressedFile = await imageCompression(compressedFile, {
        ...options,
        maxSizeMB: 0.3,
        initialQuality: 0.6,
      });
    }
    
    const originalSizeKB = (file.size / 1024).toFixed(0);
    const compressedSizeKB = (compressedFile.size / 1024).toFixed(0);
    
    console.log(`Image compressed: ${originalSizeKB}KB → ${compressedSizeKB}KB`);
    
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    throw error; // Throw error to show proper message to user
  }
}
