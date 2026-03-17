import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "../firebase";
import { validateFile, scanFileForMalware } from "../utils/security";

/**
 * Securely uploads a file to Firebase Storage.
 * Includes validation, malware scanning, and user-scoped pathing.
 */
export const uploadFileSecurely = async (file: File, folder: string = "uploads"): Promise<{ url: string; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { url: "", error: "Authentication required for uploads." };
    }

    // 1. Validate file (type and size)
    const validation = validateFile(file);
    if (!validation.valid) {
      return { url: "", error: validation.error };
    }

    // 2. Scan for malware
    const scan = await scanFileForMalware(file);
    if (!scan.safe) {
      return { url: "", error: scan.error };
    }

    // 3. Create a secure, unique path
    // Path structure: users/{userId}/{folder}/{timestamp}_{filename}
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-z0-9.]/gi, "_").toLowerCase();
    const filePath = `users/${user.uid}/${folder}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, filePath);

    // 4. Upload to Cloud Storage
    const metadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedBy: user.uid,
        scanStatus: "clean"
      }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snapshot.ref);

    return { url };
  } catch (error: any) {
    console.error("Upload error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    
    if (error.code === 'storage/unauthorized') {
      return { url: "", error: "Upload failed: You don't have permission to upload to this folder." };
    }
    if (error.code === 'storage/retry-limit-exceeded') {
      return { url: "", error: "Upload failed: Network timeout. Please check your connection." };
    }
    
    return { url: "", error: `Upload failed: ${error.message || "Unknown error"}. Please try again.` };
  }
};
