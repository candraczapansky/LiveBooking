// Minimal S3 uploader for backup files (ESM, no deps)
// Usage: node scripts/s3-upload.js <filePath> <bucket> <key> [latestKey]

import { readFileSync, statSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import https from "node:https";

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function toAmzDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const YYYY = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const DD = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return {
    amzDate: `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`,
    dateStamp: `${YYYY}${MM}${DD}`,
  };
}

function sha256Hex(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function hmac(key, data, encoding = undefined) {
  return createHmac("sha256", key).update(data).digest(encoding);
}

function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

function encodePath(path) {
  // Encode path per RFC3986, preserving '/'
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

async function putObjectSigV4({ region, bucket, key, body, sse = true, accessKeyId, secretAccessKey }) {
  const { amzDate, dateStamp } = toAmzDate(new Date());
  const service = "s3";
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const method = "PUT";
  const canonicalUri = "/" + encodePath(key);
  const payloadHash = sha256Hex(body);

  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    "content-type": "application/octet-stream",
  };
  if (sse) headers["x-amz-server-side-encryption"] = "AES256";

  // Canonical headers string (lowercase, sorted by header name)
  const sortedHeaderNames = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
  const canonicalHeaders = sortedHeaderNames.map((h) => `${h}:${String(headers[h]).trim()}\n`).join("");
  const signedHeaders = sortedHeaderNames.join(";");

  const canonicalQueryString = "";
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(Buffer.from(canonicalRequest, "utf8")),
  ].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign, "hex");

  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const options = {
    host,
    method,
    path: canonicalUri,
    headers: {
      ...headers,
      Authorization: authorizationHeader,
      "content-length": Buffer.byteLength(body),
    },
  };

  await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          const respBody = Buffer.concat(chunks).toString("utf8");
          reject(new Error(`S3 responded with ${res.statusCode}: ${respBody}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const [filePath, bucket, key, latestKey] = process.argv.slice(2);
  if (!filePath || !bucket || !key) {
    die("Usage: node scripts/s3-upload.js <filePath> <bucket> <key> [latestKey]");
  }
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-west-2";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    die("Missing AWS credentials. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Replit Secrets.");
  }
  const body = readFileSync(filePath);
  const sizeBytes = statSync(filePath).size;
  try {
    await putObjectSigV4({ region, bucket, key, body, sse: true, accessKeyId, secretAccessKey });
    console.log(`Uploaded ${sizeBytes} bytes to s3://${bucket}/${key}`);
    if (latestKey) {
      await putObjectSigV4({ region, bucket, key: latestKey, body, sse: true, accessKeyId, secretAccessKey });
      console.log(`Also uploaded to s3://${bucket}/${latestKey}`);
    }
  } catch (err) {
    console.error("S3 upload failed:", err?.message || err);
    process.exit(2);
  }
}

main();


