const ftp = require("basic-ftp");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const { execSync } = require("child_process");

// Load environment variables from .env file
dotenv.config();

async function deploy() {
  console.log("🚀 Starting Full Deployment Sequence...");

  // 1. Deploy Firebase Functions
  console.log("\n📦 1. Preparing Backend (Firebase Functions)...");
  try {
    const functionsDir = path.join(__dirname, "../functions");
    if (fs.existsSync(functionsDir)) {
      console.log("   Installing backend dependencies...");
      execSync("npm ci", { cwd: functionsDir, stdio: 'inherit' });
      
      console.log("   Deploying functions to Firebase (europe-west1)...");
      // --only functions ensures we don't accidentally overwrite DB rules or hosting if not intended
      execSync("firebase deploy --only functions", { stdio: 'inherit' });
      console.log("✅ Backend deployed successfully.");
    } else {
      console.warn("⚠️ Functions directory not found. Skipping backend deploy.");
    }
  } catch (err) {
    console.error("❌ Backend deployment failed.");
    console.error(err);
    process.exit(1);
  }

  // 2. Build Frontend
  console.log("\n🏗️  2. Building Frontend...");
  try {
    execSync("npm run build", { stdio: 'inherit' });
    console.log("✅ Frontend build complete.");
  } catch (err) {
    console.error("❌ Frontend build failed.");
    process.exit(1);
  }

  // 3. FTP Upload
  console.log("\n☁️  3. Uploading Frontend to FTP...");
  const client = new ftp.Client();
  const localDist = path.join(__dirname, "../dist");
  const remoteRoot = process.env.FTP_REMOTE_ROOT || "/";

  if (!fs.existsSync(localDist)) {
    console.error("❌ 'dist' folder not found.");
    process.exit(1);
  }

  try {
    await client.access({
      host: process.env.FTP_HOST || "ftp.valerio.nu",
      user: process.env.FTP_USER || "u238199624",
      password: process.env.FTP_PASSWORD,
      secure: false, 
    });

    console.log(`   Connected to ${process.env.FTP_HOST}`);
    await client.ensureDir(remoteRoot);
    await client.uploadFromDir(localDist, remoteRoot);

    console.log("✅ Frontend uploaded successfully!");
    console.log(`👉 Check it out at: http://valerio.nu/vaccines`);
  } catch (err) {
    console.error("❌ FTP Upload failed:", err);
  } finally {
    client.close();
  }
}

deploy();