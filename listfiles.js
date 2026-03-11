const { parseArgs } = require('./utils');
const path = require('path');
const fs = require('fs').promises;

/**
 * List files and directories in a given path.
 * @param {object} config - Configuration object.
 */
async function runListFiles(config) {
    const {
        inputs,
        depth = Infinity
    } = config;

    const targets = inputs && inputs.length > 0 ? inputs : [process.cwd()];

    for (const target of targets) {
        const absTarget = path.resolve(process.cwd(), target);
        try {
            const stat = await fs.stat(absTarget);
            if (stat.isDirectory()) {
                console.log(`\nDirectory: ${absTarget}`);
                await listDir(absTarget, '', 0, parseInt(depth));
            } else {
                console.log(`\nFile: ${absTarget}`);
            }
        } catch (error) {
            console.error(`Error: Could not process '${target}'. ${error.message}`);
        }
    }
}

/**
 * Recursively list directory contents.
 * @param {string} dir - The directory to list.
 * @param {string} prefix - The prefix for tree visualization.
 * @param {number} currentDepth - The current recursion depth.
 * @param {number} maxDepth - The maximum recursion depth.
 */
async function listDir(dir, prefix = '', currentDepth = 0, maxDepth = Infinity) {
    if (currentDepth > maxDepth) return;

    try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        // Sort items: directories first, then files
        items.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory()) return -1;
            if (!a.isDirectory() && b.isDirectory()) return 1;
            return a.name.localeCompare(b.name);
        });

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isLast = i === items.length - 1;
            const connector = isLast ? '└── ' : '├── ';
            
            console.log(`${prefix}${connector}${item.name}${item.isDirectory() ? '/' : ''}`);

            if (item.isDirectory()) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                await listDir(path.join(dir, item.name), newPrefix, currentDepth + 1, maxDepth);
            }
        }
    } catch (error) {
        console.error(`${prefix}└── Error reading directory: ${error.message}`);
    }
}

// --- Main Execution ---
const helpText = `
Usage: node listfiles.js [dirs...] [options]

Lists directory structure and filenames.

Arguments:
  dirs                  One or more directory paths to list.
                        (Default: current directory)

Options:
  --depth=<number>      Specify the maximum depth to recurse.
                        (Default: Infinity)
  --help                Show this help message.

Example:
  node listfiles.js .
  node listfiles.js ./src --depth=2
`;

const config = parseArgs(helpText);
if (config) {
    runListFiles(config);
}
