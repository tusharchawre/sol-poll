import { PinataSDK } from "pinata";

const pinata = new PinataSDK({
  pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT!,
  pinataGateway: "maroon-elegant-leopard-869.mypinata.cloud",
});

export async function uploadImage(file: File): Promise<string> {
    try {
      const upload = await pinata.upload.public.file(file);
      return upload.cid;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  }