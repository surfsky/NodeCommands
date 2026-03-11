const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');


/**
 * Converts a DOC or DOCX file to PDF using LibreOffice.
 * @param {string} docPath - The path to the document file.
 * @param {string} outputDir - The directory to save the PDF file.
 * @param {string} libreOfficePath - The path to the LibreOffice executable.
 */
async function convertDocToPdf(docPath, outputDir, libreOfficePath = '/Applications/LibreOffice.app/Contents/MacOS/soffice') {
    try {
        const command = `"${libreOfficePath}" --headless --convert-to pdf "${docPath}" --outdir "${outputDir}"`;
        await execPromise(command);
        console.log(`Converted ${docPath} to PDF.`);
    } catch (error) {
        console.error(`Error converting ${docPath} with LibreOffice:`, error);
        throw error;
    }
}

/**
 * Merges multiple PDF files into a single PDF.
 * @param {string[]} pdfPaths - An array of paths to the PDF files.
 * @param {string} outputPath - The path to save the merged PDF file.
 */
async function mergePdfs(pdfPaths, outputPath) {
    try {
        const PDFMerger = (await import('pdf-merger-js')).default;
        const merger = new PDFMerger();
        for (const pdfPath of pdfPaths) {
            await merger.add(pdfPath);
        }
        await merger.save(outputPath);
    } catch (error) {
        console.error('Error merging PDFs:', error);
        throw error;
    }
}

/**
 * Recursively finds all DOCX files in a directory.
 * @param {string} dir - The directory to search.
 * @returns {Promise<string[]>} - A list of paths to DOCX files.
 */
async function findDocFiles(dir) {
    let files = [];
    try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                files = files.concat(await findDocFiles(fullPath));
            } else if (item.isFile() && !item.name.startsWith('~') && !item.name.startsWith('.') && (item.name.endsWith('.docx') || item.name.endsWith('.doc'))) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
    }
    return files;
}

/**
 * Parse command line arguments.
 * @param {string} helpText - The help text to display for the --help flag.
 * @returns {object|null} - A configuration object or null if help was shown.
 */
function parseArgs(helpText) {
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
        console.log(helpText);
        return null;
    }

    const config = {
        inputs: []
    };
    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            if (value !== undefined) {
                config[key] = value === 'true' ? true : value === 'false' ? false : value;
            } else {
                config[key] = true; // For flags like --cleartemp
            }
        } else {
            config.inputs.push(arg);
        }
    }
    return config;
}

/**
 * Extracts text from a file.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<string>} - The extracted text.
 */
async function extractTextFromFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    try {
        switch (extension) {
            case '.docx':
                const docxResult = await mammoth.extractRawText({ path: filePath });
                return docxResult.value;
            case '.pdf':
                const dataBuffer = await fs.readFile(filePath);
                const pdfData = await pdf(dataBuffer);
                return pdfData.text;
            case '.txt':
            case '.md':
            case '.js':
            case '.json':
                return await fs.readFile(filePath, 'utf-8');
            default:
                // For other file types, try reading as text, but ignore binary files.
                const content = await fs.readFile(filePath, 'utf-8');
                // Basic check for binary content
                if (content.includes('\uFFFD')) { // Replacement character
                    return '';
                }
                return content;
        }
    } catch (error) {
        console.warn(`Warning: Could not extract text from '${filePath}'. ${error.message}`);
        return '';
    }
}

module.exports = {
    convertDocToPdf,
    mergePdfs,
    findDocFiles,
    parseArgs,
    extractTextFromFile
};