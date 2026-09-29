// Convert SVG icons to PNG using built-in canvas simulation
// Since we can't use node-canvas easily, create proper PNG files
// using a minimal PNG encoder

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'icons');

// Minimal PNG creation — creates a solid colored icon with a cricket ball design
// Using raw PNG binary format

function createPNG(width, height, pixelCallback) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    
    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type: RGB
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createChunk('IHDR', ihdrData);
    
    // IDAT chunk — raw pixel data
    const rawData = Buffer.alloc(height * (1 + width * 3)); // filter byte + RGB per pixel
    for (let y = 0; y < height; y++) {
        rawData[y * (1 + width * 3)] = 0; // no filter
        for (let x = 0; x < width; x++) {
            const [r, g, b] = pixelCallback(x, y, width, height);
            const offset = y * (1 + width * 3) + 1 + x * 3;
            rawData[offset] = r;
            rawData[offset + 1] = g;
            rawData[offset + 2] = b;
        }
    }
    
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(rawData);
    const idat = createChunk('IDAT', compressed);
    
    // IEND chunk
    const iend = createChunk('IEND', Buffer.alloc(0));
    
    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
}

// CRC32 table
const crcTable = (() => {
    const table = new Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            if (c & 1) c = 0xedb88320 ^ (c >>> 1);
            else c = c >>> 1;
        }
        table[n] = c;
    }
    return table;
})();

function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

// Draw cricket ball icon
function drawCricketBallIcon(x, y, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const padding = w * 0.12;
    const radius = (w - padding * 2) / 2;
    const cornerRadius = w * 0.18;
    
    // Distance from center
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Check if in rounded rect area
    const inRect = isInRoundedRect(x, y, 0, 0, w, h, cornerRadius);
    
    if (!inRect) {
        return [26, 29, 35]; // bg-primary outside
    }
    
    if (dist <= radius) {
        // Inside the cricket ball
        // Gradient: brighter at top-left
        const gradFactor = 1 - (dist / radius) * 0.3;
        const angle = Math.atan2(dy, dx);
        const brightFactor = 0.8 + 0.2 * Math.cos(angle + Math.PI * 0.75);
        
        let r = Math.round(180 * gradFactor * brightFactor);
        let g = Math.round(45 * gradFactor * brightFactor);
        let b = Math.round(45 * gradFactor * brightFactor);
        
        // Seam lines
        const seamOffset = radius * 0.3;
        const seamWidth = w * 0.025;
        
        // Left seam (curved)
        const leftSeamX = cx - seamOffset + Math.sin((y - (cy - radius)) / (2 * radius) * Math.PI) * seamOffset * 0.5;
        const rightSeamX = cx + seamOffset - Math.sin((y - (cy - radius)) / (2 * radius) * Math.PI) * seamOffset * 0.5;
        
        const distToLeftSeam = Math.abs(x - leftSeamX);
        const distToRightSeam = Math.abs(x - rightSeamX);
        
        if (y > cy - radius + padding && y < cy + radius - padding) {
            if (distToLeftSeam < seamWidth || distToRightSeam < seamWidth) {
                r = 245; g = 230; b = 200; // seam color
            }
            
            // Stitches — small horizontal marks near seams
            const stitchSpacing = radius * 0.25;
            const relY = (y - (cy - radius + padding)) % stitchSpacing;
            if (relY < w * 0.015) {
                const stitchWidth = w * 0.04;
                if ((Math.abs(x - leftSeamX) < stitchWidth + seamWidth * 2 && Math.abs(x - leftSeamX) > seamWidth) ||
                    (Math.abs(x - rightSeamX) < stitchWidth + seamWidth * 2 && Math.abs(x - rightSeamX) > seamWidth)) {
                    r = 245; g = 230; b = 200;
                }
            }
        }
        
        return [clamp(r), clamp(g), clamp(b)];
    } else {
        // Background — dark gradient
        const bgDist = dist / (w / 2);
        const bgFactor = 0.95 + 0.05 * bgDist;
        return [
            clamp(Math.round(34 * bgFactor)),
            clamp(Math.round(38 * bgFactor)),
            clamp(Math.round(50 * bgFactor))
        ];
    }
}

function isInRoundedRect(px, py, rx, ry, rw, rh, cr) {
    // Check corners
    const corners = [
        [rx + cr, ry + cr],
        [rx + rw - cr, ry + cr],
        [rx + cr, ry + rh - cr],
        [rx + rw - cr, ry + rh - cr]
    ];
    
    if (px < rx + cr && py < ry + cr) {
        return Math.sqrt((px - corners[0][0]) ** 2 + (py - corners[0][1]) ** 2) <= cr;
    }
    if (px > rx + rw - cr && py < ry + cr) {
        return Math.sqrt((px - corners[1][0]) ** 2 + (py - corners[1][1]) ** 2) <= cr;
    }
    if (px < rx + cr && py > ry + rh - cr) {
        return Math.sqrt((px - corners[2][0]) ** 2 + (py - corners[2][1]) ** 2) <= cr;
    }
    if (px > rx + rw - cr && py > ry + rh - cr) {
        return Math.sqrt((px - corners[3][0]) ** 2 + (py - corners[3][1]) ** 2) <= cr;
    }
    
    return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}

function clamp(v) { return Math.max(0, Math.min(255, v)); }

// Generate all icon sizes
sizes.forEach(size => {
    console.log(`Generating icon-${size}.png...`);
    const png = createPNG(size, size, drawCricketBallIcon);
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png);
    console.log(`  ✓ icon-${size}.png (${png.length} bytes)`);
});

console.log('\nAll PNG icons generated successfully!');
