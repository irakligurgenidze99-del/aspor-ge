import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}

/** Local filesystem under public/uploads — development only (serverless file systems are ephemeral). */
class LocalStorage implements StorageAdapter {
  root = path.join(process.cwd(), 'public', 'uploads');
  async put(key: string, body: Buffer) {
    const file = path.join(this.root, key);
    if (!file.startsWith(this.root + path.sep)) throw new Error('invalid key');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return { url: `/uploads/${key}` };
  }
  async delete(key: string) {
    const file = path.join(this.root, key);
    if (!file.startsWith(this.root + path.sep)) return;
    await fs.rm(file, { force: true });
  }
}

/** Any S3-compatible bucket (recommended: Cloudflare R2 with a public custom domain). */
class S3Storage implements StorageAdapter {
  client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    });
  }
  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
    );
    return { url: `${process.env.STORAGE_PUBLIC_BASE_URL!.replace(/\/$/, '')}/${key}` };
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
  }
}

let instance: StorageAdapter | null = null;
export function storage(): StorageAdapter {
  if (instance) return instance;
  if (process.env.STORAGE_PROVIDER === 's3') {
    for (const k of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'STORAGE_PUBLIC_BASE_URL']) {
      if (!process.env[k]) throw new Error(`STORAGE_PROVIDER=s3 requires ${k}`);
    }
    instance = new S3Storage();
  } else {
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) throw new Error('Local storage is not supported on Vercel. Set STORAGE_PROVIDER=s3.');
    instance = new LocalStorage();
  }
  return instance;
}
