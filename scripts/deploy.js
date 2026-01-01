const ftp = require("basic-ftp");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

// Load environment variables from .env file
dotenv.config();

async function deploy() {
  const client = new ftp.Client();
  // client.ftp.verbose = true; // Uncomment to see detailed logs

  const localDist = path.join(__dirname, "../dist");
  
  // Use the specific path you provided, but allow override via .env
  const remoteRoot = process.env.FTP_REMOTE_ROOT || "/home/u238199624/domains/valerio.nu/public_html/vaccines";

  if (!fs.existsSync(localDist)) {
    console.error("❌ 'dist' folder not found. Please run 'npm run build' first.");
    process.exit(1);
  }

  console.log("🚀 Starting deployment...");
  console.log(`📂 Source: ${localDist}`);
  console.log(`☁️  Target: ${process.env.FTP_HOST || 'ftp.valerio.nu'} -> ${remoteRoot}`);

  try {
    await client.access({
      host: process.env.FTP_HOST || "ftp.valerio.nu", // Default to domain if missing
      user: process.env.FTP_USER || "u238199624",
      password: process.env.FTP_PASSWORD,
      secure: false, // Try false first for standard FTP, set to true if explicit FTPS is needed
    });

    console.log("✅ Connected to FTP server");

    // Ensure remote directory exists
    // Note: ensureDir creates the directory if it doesn't exist
    await client.ensureDir(remoteRoot);

    console.log("DTO Uploading files...");
    
    // uploadFromDir uploads the CONTENTS of localDist to the current remote directory
    await client.uploadFromDir(localDist, remoteRoot);

    console.log("✨ Deployment successful!");
    console.log(`👉 Check it out at: http://valerio.nu/vaccines`);
  } catch (err) {
    console.error("❌ Deployment failed:", err);
  } finally {
    client.close();
  }
}

deploy();