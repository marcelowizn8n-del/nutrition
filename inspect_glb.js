const fs = require('fs');
const path = require('path');

const files = process.argv.slice(2);

files.forEach(filePath => {
    try {
        if (!fs.existsSync(filePath)) return;

        const buffer = fs.readFileSync(filePath);

        // Parse GLB Header
        const magic = buffer.readUInt32LE(0);
        if (magic !== 0x46546C67) {
            // console.log(`[SKIP] ${path.basename(filePath)}: Not a GLB`);
            return;
        }

        // Parse Chunk 0 (JSON)
        const chunkLength = buffer.readUInt32LE(12);
        const chunkType = buffer.readUInt32LE(16);

        if (chunkType !== 0x4E4F534A) return;

        const jsonBuffer = buffer.slice(20, 20 + chunkLength);
        const json = JSON.parse(jsonBuffer.toString('utf8'));

        let hasMorphs = false;
        let targetBytes = 0;

        if (json.meshes) {
            json.meshes.forEach(mesh => {
                if (mesh.primitives) {
                    mesh.primitives.forEach(prim => {
                        if (prim.targets) {
                            hasMorphs = true;
                            console.log(`      Found ${prim.targets.length} targets`);
                            // Try to find names in mesh.extras
                            if (mesh.extras && mesh.extras.targetNames) {
                                console.log(`      Target Names: ${mesh.extras.targetNames.join(', ')}`);
                            }
                        }
                    });
                }
            });
        }

        if (hasMorphs) {
            console.log(`✅ [GOOD] ${path.basename(filePath)}: Has Morph Targets!`);
        } else {
            console.log(`❌ [BAD]  ${path.basename(filePath)}: Static Mesh (No Morphs)`);
        }

    } catch (err) {
        console.log(`⚠️ [ERR]  ${path.basename(filePath)}: ${err.message}`);
    }
});
