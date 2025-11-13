/**
 * Grass Sprite GLB Optimization Script
 * 
 * This script optimizes the grass sprite GLB file by:
 * 1. Compressing textures (WebP format)
 * 2. Removing duplicate data
 * 3. Optimizing geometry
 * 
 * Usage: node scripts/optimize-grass.js
 */

import { NodeIO } from '@gltf-transform/core';
import { textureCompress, dedup } from '@gltf-transform/functions';
import { EXTTextureWebP } from '@gltf-transform/extensions';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '../public/models/grasssprite-transformed.glb');
const outputPath = path.join(__dirname, '../public/models/grasssprite-optimized.glb');

async function optimizeGrass() {
  console.log('🌱 Starting grass sprite optimization...\n');

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Get original file size
  const originalSize = fs.statSync(inputPath).size;
  console.log(`📦 Original file size: ${(originalSize / 1024).toFixed(2)} KB\n`);

  try {
    // Initialize GLTF I/O with extensions
    const io = new NodeIO().registerExtensions([EXTTextureWebP]);
    
    // Read the GLB file
    console.log('📖 Reading GLB file...');
    const document = await io.read(inputPath);
    
    // Get texture information before optimization
    const textures = document.getRoot().listTextures();
    console.log(`   Found ${textures.length} texture(s)`);
    textures.forEach((texture, i) => {
      const image = texture.getImage();
      if (image) {
        console.log(`   Texture ${i + 1}: ${image.byteLength} bytes`);
      }
    });
    console.log('');

    // Step 1: Remove duplicate data
    console.log('🔍 Removing duplicate data...');
    await dedup()(document);
    console.log('   ✅ Duplicates removed\n');

    // Step 2: Compress textures to WebP
    console.log('🗜️  Compressing textures to WebP (quality: 0.85)...');
    await textureCompress({
      targetFormat: 'webp',
      quality: 0.85, // Good balance between quality and size (0-1)
      // Use 'webp' for best compression, or 'jpeg' if WebP not supported
    })(document);
    console.log('   ✅ Textures compressed\n');

    // Step 3: Write optimized file
    console.log('💾 Writing optimized GLB file...');
    await io.write(outputPath, document);
    console.log('   ✅ File written\n');

    // Get optimized file size
    const optimizedSize = fs.statSync(outputPath).size;
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    const sizeReduction = ((originalSize - optimizedSize) / 1024).toFixed(2);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Optimization Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Original:  ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`📦 Optimized: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`📉 Reduction: ${reduction}% (${sizeReduction} KB saved)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`✨ Optimized file saved to: ${outputPath}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Test the optimized file in your app');
    console.log('   2. Update InstancedGrassSprite.jsx to use grasssprite-optimized.glb');
    console.log('   3. If quality is acceptable, replace the original file');

  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

// Run optimization
optimizeGrass().catch(console.error);

