import * as Minio from "minio";

const minioClient = new Minio.Client({
  endPoint: process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.NEXT_PUBLIC_MINIO_PORT || "9000", 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET = process.env.MINIO_BUCKET || "wardrobe-images";

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    await minioClient.setBucketPolicy(
      BUCKET,
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          },
        ],
      })
    );
  }
}

export async function uploadImage(
  file: File,
  userId: string
): Promise<string> {
  await ensureBucket();

  const ext = file.name.split(".").pop() || "jpg";
  const objectName = `${userId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
    "Content-Type": file.type || "application/octet-stream",
  });

  const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "localhost";
  const port = process.env.NEXT_PUBLIC_MINIO_PORT || "9000";
  return `http://${endpoint}:${port}/${BUCKET}/${objectName}`;
}

export async function deleteImage(imageUrl: string): Promise<void> {
  const url = new URL(imageUrl);
  const objectName = url.pathname.replace(`/${BUCKET}/`, "").replace(/^\//, "");
  if (!objectName) {
    throw new Error(`无法从 URL 解析对象路径: ${imageUrl}`);
  }
  await minioClient.removeObject(BUCKET, objectName);
}
