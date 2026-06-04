const fs = require('fs');
const path = require('path');

// Resolve default paths relative to the project root
const defaultInputPath = path.join(__dirname, '../app/data/channels.json');
const defaultOutputPath = path.join(__dirname, '../app/data/channels.m3u');

// Get arguments from CLI if provided, otherwise use defaults
const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultInputPath;
const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : defaultOutputPath;

console.log('🔄 IPTV Channel Converter (JSON -> M3U)');
console.log(`📂 Input JSON:  ${inputPath}`);
console.log(`💾 Output M3U: ${outputPath}\n`);

// Check if input file exists
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Error: Input file does not exist at "${inputPath}"`);
  process.exit(1);
}

try {
  // Read and parse JSON file
  console.log('📖 Reading JSON data...');
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const channels = JSON.parse(rawData);

  if (!Array.isArray(channels)) {
    throw new Error('JSON root element must be an array of channel objects.');
  }

  console.log(`📊 Found ${channels.length} channels. Converting...`);

  // Build the M3U playlist content
  const m3uLines = ['#EXTM3U'];

  channels.forEach((channel, index) => {
    if (!channel.url) {
      console.warn(`⚠️ Warning: Channel at index ${index} ("${channel.name || 'Unnamed'}") has no URL. Skipping.`);
      return;
    }

    // Prepare EXTINF attributes
    let extinf = '#EXTINF:-1';
    
    if (channel.logo) {
      extinf += ` tvg-logo="${channel.logo}"`;
    }
    
    if (channel.group) {
      extinf += ` group-title="${channel.group}"`;
    }

    // Append the channel name
    extinf += `,${channel.name || 'Unnamed Channel'}`;

    m3uLines.push(extinf);
    m3uLines.push(channel.url);
  });

  // Write to output file
  console.log('✍️ Writing M3U file...');
  
  // Ensure the directory for the output file exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, m3uLines.join('\n') + '\n', 'utf8');

  console.log(`✅ Success! M3U playlist generated at: "${outputPath}"`);
  console.log(`📝 Total channels in M3U: ${m3uLines.length / 2 - 0.5}`);

} catch (error) {
  console.error('❌ Conversion failed with error:');
  console.error(error.message);
  process.exit(1);
}
