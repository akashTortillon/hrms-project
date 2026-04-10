import crypto from "crypto";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const LOCAL_ROOT = path.resolve("uploads");
let s3Client = null;

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeFileName = (name = "file") => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");

const hmac = (key, value, encoding) => crypto.createHmac("sha256", key).update(value).digest(encoding);

const toAmzDate = (date) => date.toISOString().replace(/[:-]|\.\d{3}/g, "");

const buildPublicUrl = ({ bucket, region, key, endpoint }) => {
  if (process.env.AWS_S3_PUBLIC_BASE_URL) {
    return `${process.env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }

  if (endpoint) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "eu-north-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

const uploadToS3 = async ({ buffer, mimeType, key }) => {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "eu-north-1";
  const endpoint = process.env.AWS_S3_ENDPOINT || "";

  if (!accessKey || !secretKey || !bucket) {
    throw new Error("S3 credentials are not configured");
  }

  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = endpoint
    ? new URL(endpoint).host
    : `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = endpoint ? `/${bucket}/${key}` : `/${key}`;
  const payloadHash = sha256Hex(buffer);
  const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");

  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmac(kSigning, stringToSign, "hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const targetUrl = endpoint
    ? `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  const response = await fetch(targetUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
      "Host": host,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      "Authorization": authorization
    },
    body: buffer
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`S3 upload failed: ${response.status} ${errorText}`);
  }

  return {
    filePath: key,
    fileUrl: buildPublicUrl({ bucket, region, key, endpoint }),
    storage: "S3"
  };
};

const storeLocally = ({ buffer, originalName, folder }) => {
  const targetDir = path.join(LOCAL_ROOT, folder);
  ensureDir(targetDir);
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${sanitizeFileName(originalName)}`;
  const absolutePath = path.join(targetDir, fileName);
  fs.writeFileSync(absolutePath, buffer);
  const relativePath = path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");

  return {
    filePath: relativePath,
    fileUrl: `/${relativePath}`,
    storage: "LOCAL"
  };
};

export const storeUploadedFile = async ({ file, folder = "employee", preferS3 = false }) => {
  if (!file) {
    throw new Error("File is required");
  }

  const buffer = file.buffer || fs.readFileSync(file.path);
  const mimeType = file.mimetype || "application/octet-stream";
  const originalName = file.originalname || path.basename(file.path || "file");

  if (preferS3) {
    try {
      const key = `${folder}/${Date.now()}-${sanitizeFileName(originalName)}`;
      const stored = await uploadToS3({ buffer, mimeType, key });
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return stored;
    } catch (error) {
      throw error;
    }
  }

  return storeLocally({ buffer, originalName, folder });
};

export const deleteStoredFile = (filePath, storage = "LOCAL") => {
  if (!filePath || storage !== "LOCAL") {
    return;
  }

  const absolutePath = path.resolve(filePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

export const getSignedFileUrl = async ({ filePath, fileUrl, storage = "LOCAL", expiresIn = 60 * 60 * 12 }) => {
  if (storage !== "S3") {
    return fileUrl || (filePath ? `/${String(filePath).replace(/^\/+/, "")}` : "");
  }

  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  if (!bucket || !filePath) {
    return fileUrl || "";
  }

  const key = String(filePath).replace(/^\/+/, "");
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(getS3Client(), command, { expiresIn });
};
