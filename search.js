const { parseArgs, extractTextFromFile } = require('./utils');
const path = require('path');
const fs = require('fs').promises;
const glob = require('glob');

/**
 * Searches for text in files within a directory.
 * @param {object} config - Configuration object.
 */
async function runSearch(config) {
    const {
        inputs,
        query,
        dir = '.'
    } = config;

    const searchDir = inputs && inputs.length > 0 ? inputs[0] : dir;
    const searchTerms = Array.isArray(query) ? query : [query];

    if (!searchTerms || searchTerms.length === 0) {
        console.error('Error: No search query provided. Use --query=<text> or --query=<text1> --query=<text2>.');
        return;
    }

    console.log(`Searching for [${searchTerms.join(', ')}] in ${path.resolve(searchDir)}...\n`);

    const fileExtensions = ['doc', 'docx', 'pdf', 'txt', 'md', 'js', 'json'];
    const globPattern = `**/*.{${fileExtensions.join(',')}}`;

    const files = glob.sync(globPattern, { cwd: searchDir, nodir: true, absolute: true });

    let matchCount = 0;

    for (const file of files) {
        const text = await extractTextFromFile(file);
        if (!text) continue;

        const lines = text.split(/\r?\n/);
        let fileHasMatch = false;
        let fileHeaderPrinted = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const term of searchTerms) {
                let matchIndex = -1;
                // Use a case-insensitive search
                if ((matchIndex = line.toLowerCase().indexOf(term.toLowerCase())) !== -1) {
                    if (!fileHeaderPrinted) {
                        const fileDir = path.dirname(file);
                        const fileName = path.basename(file);
                        console.log(`\n------------------------------------------------------`);
                        console.log(`目录: ${fileDir}`);
                        console.log(`文件: ${fileName}`);
                        console.log(`------------------------------------------------------`);
                        fileHeaderPrinted = true;
                        fileHasMatch = true;
                    }
                    const contextStart = Math.max(0, matchIndex - 20);
                    const contextEnd = Math.min(line.length, matchIndex + term.length + 20);
                    const context = line.substring(contextStart, contextEnd).replace(/\r?\n/g, ' ');
                    
                    console.log(`[位置: 第 ${i + 1} 行] [匹配: "${term}"]`);
                    console.log(`内容: ...${context}...`);
                    console.log(`-`);
                }
            }
        }
        if(fileHasMatch) {
            matchCount++;
            console.log('\n');
        }
    }

    if (matchCount === 0) {
        console.log('No matches found.');
    }
}

// --- Main Execution ---
const helpText = `
Usage: node search.js [dir] [options]

Searches for text in files within a specified directory.
Supports .doc, .docx, .pdf, .txt, .md, .js, .json files.

Arguments:
  dir                   The directory to search in.
                        (Default: current directory)

Options:
  --query=<text>        The text to search for. Can be specified multiple times.
  --help                Show this help message.

Example:
  node search.js ./my_project --query=hello --query=world
  node search.js --query="important function"
`;

const config = parseArgs(helpText);
if (config) {
    runSearch(config);
}
