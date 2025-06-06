import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import config
const configPath = path.join(__dirname, "../config.cjs");
const config = await import(configPath).then((m) => m.default || m).catch(() => ({}));

const update = async (m, Matrix) => {
  try {
    const prefix = config.Prefix || config.PREFIX || ".";
    const cmd = m.body?.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";

    if (cmd !== "update") return;

    // Allow bot or owner
    const botNumber = await Matrix.decodeJid(Matrix.user.id);
    const isCreator = [botNumber, config.OWNER_NUMBER + "@s.whatsapp.net"].includes(m.sender);
    if (!isCreator) {
      return Matrix.sendMessage(m.from, {
        text: `◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ Piss off, wannabe! Only *Toxic-MD* or its boss can update this beast! 😤🔪
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`,
      }, { quoted: m });
    }

    await m.React("⏳");

    const msg = await Matrix.sendMessage(
      m.from,
      { text: `◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ *Toxic-MD* is sniffin’ for updates, fam! Hold tight... 🕵️‍♂️
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈` },
      { quoted: m }
    );

    const editMessage = async (newText) => {
      try {
        await Matrix.sendMessage(m.from, { text: newText, edit: msg.key });
      } catch (error) {
        console.error(`Message edit failed: ${error.message}`);
      }
    };

    // Fetch latest commit hash
    const { data: commitData } = await axios.get("https://api.github.com/repos/xhclintohn/Ultra-MD/commits/main", {
      headers: config.GITHUB_TOKEN ? { Authorization: `token ${config.GITHUB_TOKEN}` } : {},
    });
    const latestCommitHash = commitData.sha;

    // Load package.json
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      await m.React("❌");
      return editMessage(`◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ *Toxic-MD* can’t find package.json, fam! Shit’s broken! 😣
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`);
    }
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    const currentHash = packageJson.commitHash || "unknown";

    if (latestCommitHash === currentHash) {
      await m.React("✅");
      return editMessage(`◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ *Toxic-MD* is fresh as fuck, fam! No updates needed! 😎🔥
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`);
    }

    await editMessage(`◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ New *Toxic-MD* update found! Snatchin’ that shit now... 🚀
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`);

    // Download latest ZIP
    const zipPath = path.join(process.cwd(), "latest.zip");
    const writer = fs.createWriteStream(zipPath);
    const response = await axios({
      method: "get",
      url: "https://github.com/xhclint/Toxic-MD/archive/main.zip",
      responseType: "stream",
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await editMessage(`◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ *Toxic-MD* is rippin’ open that ZIP, fam... 📦
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`);

    // Extract ZIP
    const extractPath = path.join(process.cwd(), "latest");
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    await editMessage(`◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ Swappin’ out the old shit for new *Toxic-MD* heat... 🔄
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`);

    // Replace files, skip configs
    const sourcePath = path.join(extractPath, "Toxic-MD-main");
    await copyFolderSync(sourcePath, process.cwd(), ["package.json", "config.cjs", ".env", "node_modules"]);

    // Update package.json with new commit hash
    packageJson.commitHash = latestCommitHash;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Cleanup
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });

    await editMessage(`◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ *Toxic-MD* update locked in! Restarting to flex the new shit... ♻️🔥
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`);

    await m.React("✅");
    setTimeout(() => process.exit(0), 2000);
  } catch (error) {
    console.error(`❌ Update error: ${error.message}`);
    await m.React("❌");
    await Matrix.sendMessage(
      m.from,
      {
        text: `◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈
│❒ *Toxic-MD* fucked up the update, fam! Error: ${error.message} 😈
◈┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅┅◈`,
      },
      { quoted: m }
    );
  }
};

async function copyFolderSync(source, target, filesToSkip = []) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const items = fs.readdirSync(source);
  for (const item of items) {
    const srcPath = path.join(source, item);
    const destPath = path.join(target, item);

    if (filesToSkip.includes(item)) continue;

    const stat = fs.lstatSync(srcPath);
    if (stat.isDirectory()) {
      await copyFolderSync(srcPath, destPath, filesToSkip);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default update;
