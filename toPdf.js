const { convertDocToPdf, findDocFiles, parseArgs } = require('./utils');
const path = require('path');
const fs = require('fs').promises;

/**
 * Main function to convert documents to PDF.
 * @param {object} config - Configuration object.
 */
async function runConvertToPdf(config) {
    const {
        inputs,
        outdir = './output_pdfs/',
        libreoffice
    } = config;

    const absOutDir = path.resolve(process.cwd(), outdir);

    try {
        console.log("Step 1: Preparing output directory");
        await fs.mkdir(absOutDir, { recursive: true });

        let docFiles = [];
        if (config.inputs && config.inputs.length > 0) {
            for (const input of config.inputs) {
                try {
                    const stat = await fs.stat(input);
                    if (stat.isDirectory()) {
                        docFiles = docFiles.concat(await findDocFiles(input));
                    } else {
                        docFiles.push(input);
                    }
                } catch (error) {
                    console.warn(`Warning: Could not process input '${input}'. ${error.message}`);
                }
            }
        } else {
            // If no inputs, default to scanning the current directory
            console.log("No specific inputs provided. Scanning current directory for Word files...");
            docFiles = await findDocFiles(process.cwd());
        }

        if (docFiles.length === 0) {
            console.log(`No .doc or .docx files found in the provided inputs.`);
            return;
        }
        console.log(`Found ${docFiles.length} document(s) to convert.`);

        console.log("Step 2: Converting documents to PDF");
        for (const docPath of docFiles) {
            try {
                await convertDocToPdf(docPath, absOutDir, libreoffice);
            } catch (error) {
                console.error(`Failed to convert ${docPath}: ${error.message}`);
            }
        }

        console.log(`\nConversion process finished. PDFs are saved in ${absOutDir}`);

    } catch (error) {
        console.error('An error occurred during the process:', error);
    }
}

// --- Main Execution ---
const helpText = `
Usage: node toPdf.js [files_or_dirs...] [options]

Converts one or more Word documents to PDF format.

Arguments:
  files_or_dirs         One or more file paths or directories to process.

Options:
  --outdir=<path>       Specify the output directory for PDF files.
                        (Default: ./output_pdfs/)
  --libreoffice=<path>  Specify the path to the LibreOffice executable.
  --help                Show this help message.

Example:
  node toPdf.js ./my_doc.docx ./another_doc.docx --outdir=./converted
  node toPdf.js ./my_docs_folder/
`;

const config = parseArgs(helpText);
if (config) {
    runConvertToPdf(config);
}