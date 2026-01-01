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
  
  // CHANGED: Deploy to the root of the FTP user as the account is already scoped to the target folder.
  const remoteRoot = process.env.FTP_REMOTE_ROOT || "/";

  if (!fs.existsSync(localDist)) {
    console.error("❌ 'dist' folder not found. Please run 'npm run build' first.");
    process.exit(1);
  }

  console.log("🚀 Starting deployment...");
  console.log(`📂 Source: ${localDist}`);
  console.log(`☁️  Target: ${process.env.FTP_HOST || 'ftp.valerio.nu'} -> ${remoteRoot}`);

  try {
    await client.access({
      host: process.env.FTP_HOST || "ftp.valerio.nu",
      user: process.env.FTP_USER || "u238199624",
      password: process.env.FTP_PASSWORD,
      secure: false, 
    });

    console.log("✅ Connected to FTP server");

    // Ensure remote directory exists and switch to it
    await client.ensureDir(remoteRoot);

    console.log("DTO Uploading files...");
    
    // uploadFromDir uploads the CONTENTS of localDist to the remote path
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