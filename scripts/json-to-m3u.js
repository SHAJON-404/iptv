const fs = require('fs');
const path = require('path');

console.log('🔄 IPTV Channel Converter (JSON -> M3U)');

// Helper function to convert a single JSON channel list to M3U
function convertFile(inputPath, outputPath) {
  console.log(`📂 Input JSON:  ${inputPath}`);
  console.log(`💾 Output M3U: ${outputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file does not exist at "${inputPath}"`);
    return false;
  }

  try {
    const rawData = fs.readFileSync(inputPath, 'utf8');
    const channels = JSON.parse(rawData);

    if (!Array.isArray(channels)) {
      throw new Error('JSON root element must be an array of channel objects.');
    }

    console.log(`📊 Found ${channels.length} channels. Converting...`);

    const m3uLines = ['#EXTM3U'];

    channels.forEach((channel, index) => {
      if (!channel.url) {
        console.warn(`⚠️ Warning: Channel at index ${index} ("${channel.name || 'Unnamed'}") has no URL. Skipping.`);
        return;
      }

      let extinf = '#EXTINF:-1';
      
      if (channel.logo) {
        extinf += ` tvg-logo="${channel.logo}"`;
      }
      
      if (channel.group) {
        extinf += ` group-title="${channel.group}"`;
      }

      extinf += `,${channel.name || 'Unnamed Channel'}`;

      m3uLines.push(extinf);
      m3uLines.push(channel.url);
    });

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, m3uLines.join('\n') + '\n', 'utf8');

    console.log(`✅ Success! M3U playlist generated at: "${outputPath}"`);
    console.log(`📝 Total channels in M3U: ${m3uLines.length / 2 - 0.5}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Conversion failed for "${inputPath}" with error:`);
    console.error(error.message);
    return false;
  }
}

// Check if specific input/output arguments are provided via CLI
if (process.argv[2]) {
  const inputPath = path.resolve(process.argv[2]);
  const outputPath = process.argv[3] 
    ? path.resolve(process.argv[3]) 
    : inputPath.replace(/\.json$/i, '.m3u');
  const success = convertFile(inputPath, outputPath);
  process.exit(success ? 0 : 1);
} else {
  // Otherwise, default to converting all .json files in app/data/
  const dataDir = path.join(__dirname, '../app/data');
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Error: Data directory does not exist at "${dataDir}"`);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log('⚠️ No JSON files found in app/data/');
    process.exit(0);
  }

  console.log(`🔍 Found ${jsonFiles.length} JSON file(s) in app/data/\n`);

  let allSuccess = true;
  jsonFiles.forEach(file => {
    const inputPath = path.join(dataDir, file);
    const outputPath = path.join(dataDir, file.replace(/\.json$/i, '.m3u'));
    const success = convertFile(inputPath, outputPath);
    if (!success) {
      allSuccess = false;
    }
  });

  process.exit(allSuccess ? 0 : 1);
}

