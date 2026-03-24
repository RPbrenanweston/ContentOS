export interface UploadResult {
  url: string;
  path: string;
  size: number;
}

export interface IStorageService {
  upload(
    file: File | Buffer,
    path: string,
    contentType: string,
  ): Promise<UploadResult>;

  getSignedUrl(path: string, expiresInSeconds?: number): Promise<string>;

  delete(path: string): Promise<void>;
}
