import cloudinary, { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";

export function uploadImage(
  file: string,
  public_id?: string,
  overwrite?: boolean,
  invalidate?: boolean
): Promise<UploadApiResponse | UploadApiErrorResponse | undefined> {
  return new Promise((resolve) => {
    cloudinary.v2.uploader.upload(
      file,
      {
        public_id,
        overwrite,
        invalidate,
      },
      (error: UploadApiErrorResponse | undefined, response: UploadApiResponse | undefined) => {
        if (error) resolve(error);
        resolve(response);
      }
    );
  });
}

export function uploadVideo(
  file: string,
  public_id?: string,
  overwrite?: boolean,
  invalidate?: boolean
): Promise<UploadApiResponse | UploadApiErrorResponse | undefined> {
  return new Promise((resolve) => {
    cloudinary.v2.uploader.upload(
      file,
      {
        resource_type: "video",
        chunk_size: 5000,
        public_id,
        overwrite,
        invalidate,
      },
      (error: UploadApiErrorResponse | undefined, response: UploadApiResponse | undefined) => {
        if (error) resolve(error);
        resolve(response);
      }
    );
  });
}
