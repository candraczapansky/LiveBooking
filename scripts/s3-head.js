// Minimal S3 HEAD object (ESM, no deps)
// Usage: node scripts/s3-head.js <bucket> <key>

import https from "node:https";
import { createHmac, createHash } from "node:crypto";

function die(m, c = 1) { console.error(m); process.exit(c); }

function toAmzDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const YYYY = date.getUTCFullYear();
  const MM = pad(date.getUTCMonth() + 1);
  const DD = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mm = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return { amzDate: `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`, dateStamp: `${YYYY}${MM}${DD}` };
}

function sha256Hex(buffer) { return createHash("sha256").update(buffer).digest("hex"); }
function hmac(key, data, enc) { return createHmac("sha256", key).update(data).digest(enc); }
function getSignatureKey(secretKey, dateStamp, region, service) {
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}
function encodePath(path) {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg).replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

async function headObject({ region, bucket, key, accessKeyId, secretAccessKey }) {
  const { amzDate, dateStamp } = toAmzDate(new Date());
  const service = "s3";
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const method = "HEAD";
  const canonicalUri = "/" + encodePath(key);
  const payloadHash = sha256Hex("");
  const headers = { host, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash };
  const sortedHeaderNames = Object.keys(headers).map((h) => h.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderNames.map((h) => `${h}:${String(headers[h]).trim()}\n`).join("");
  const signedHeaders = sortedHeaderNames.join(";");
  const canonicalQueryString = "";
  const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, sha256Hex(Buffer.from(canonicalRequest, "utf8"))].join("\n");
  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign, "hex");
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const options = { host, method, path: canonicalUri, headers: { ...headers, Authorization: authorization } };
  await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`status: ${res.statusCode}`);
      Object.entries(res.headers).forEach(([k, v]) => console.log(`${k}: ${v}`));
      res.resume();
      res.on("end", resolve);
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const [bucket, key] = process.argv.slice(2);
  if (!bucket || !key) die("Usage: node scripts/s3-head.js <bucket> <key>");
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) die("Missing AWS creds.");
  await headObject({ region, bucket, key, accessKeyId, secretAccessKey });
}

main();


