const { convertDocToPdf, mergePdfs, findDocFiles, parseArgs } = require('./utils');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

/**
 * Main function to process documents and merge them into a single PDF.
 * @param {object} config - Configuration object.
 */
async function runMergeDocxToPdf(config) {
    const {
        inputs,
        outfile,
        cleartemp = false,
        libreoffice
    } = config;

    // Define output path
    let absOutPath;
    if (outfile) {
        absOutPath = path.resolve(process.cwd(), outfile);
    } else if (inputs && inputs.length > 0) {
        // Default to the directory of the first valid input file/directory
        let firstValidInputPath = null;
        for (const input of inputs) {
            try {
                const stat = await fs.stat(input);
                if (stat.isDirectory()) {
                    firstValidInputPath = input;
                    break;
                } else if (stat.isFile()) {
                    firstValidInputPath = path.dirname(input);
                    break;
                }
            } catch (error) {
                // Ignore invalid paths for default output calculation
            }
        }
        if (firstValidInputPath) {
            absOutPath = path.resolve(firstValidInputPath, 'merged.pdf');
        } else {
            // Fallback if no valid input path found
            absOutPath = path.resolve(os.homedir(), 'Desktop', 'merged.pdf');
        }
    } else {
        // Fallback if no inputs provided
        absOutPath = path.resolve(os.homedir(), 'Desktop', 'merged.pdf');
    }

    const absTempDir = path.resolve(os.tmpdir(), 'doctopdf_temp');

    try {
        if (cleartemp) {
            console.log(`Clearing temporary directory: ${absTempDir}`);
            await fs.rm(absTempDir, { recursive: true, force: true });
        }
        await fs.mkdir(absTempDir, { recursive: true });

        let docFiles = [];
        if (inputs && inputs.length > 0) {
             for (const input of inputs) {
                try {
                    const stat = await fs.stat(input);
                    if (stat.isDirectory()) {
                        docFiles = docFiles.concat(await findDocFiles(input));
                    } else if (stat.isFile()) {
                        docFiles.push(input);
                    }
                } catch (error) {
                    console.warn(`Warning: Could not process input '${input}'. ${error.message}`);
                }
            }
        } else {
            console.log("No specific inputs provided. Scanning current directory for Word files...");
            docFiles = await findDocFiles(process.cwd());
        }

        console.log("Step 1: Converting documents to PDF in temp directory...");
        const tempPdfPaths = [];
        for (const docPath of docFiles) {
            const pdfFileName = `${path.parse(docPath).name}.pdf`;
            const tempPdfPath = path.join(absTempDir, pdfFileName);
            try {
                await convertDocToPdf(docPath, absTempDir, libreoffice);
                await fs.stat(tempPdfPath); // Verify file exists
                tempPdfPaths.push(tempPdfPath);
            } catch (error) {
                console.error(`Failed to convert ${docPath}: ${error.message}`);
            }
        }

        if (tempPdfPaths.length > 0) {
            console.log(`Step 2: Merging ${tempPdfPaths.length} PDF(s) into ${absOutPath}`);
            await mergePdfs(tempPdfPaths, absOutPath);
            console.log('Successfully merged PDF created.');
        } else {
            console.log('No documents were successfully converted. No merge was performed.');
        }

    } catch (error) {
        console.error('An error occurred during the process:', error);
    } finally {
        if (!cleartemp) {
            console.log(`Temporary files are located at: ${absTempDir}`);
        } else {
            await fs.rm(absTempDir, { recursive: true, force: true });
            console.log('Temporary directory cleared.');
        }
    }
}

// --- Main Execution ---
const helpText = `
Usage: node mergeToPdf.js [files_or_dirs...] [options]

Converts and merges multiple Word documents into a single PDF.

Arguments:
  files_or_dirs         One or more file paths or directories to process.

Options:
  --outfile=<path>      Specify the output merged PDF file path.
                        (Default: 'merged.pdf' in the first input's directory)
  --cleartemp           Clear the temporary directory after processing.
  --libreoffice=<path>  Specify the path to the LibreOffice executable.
  --help                Show this help message.

Example:
  node mergeToPdf.js ./doc1.docx ./doc2.docx --outfile=final.pdf
  node mergeToPdf.js ./my_docs_folder/
`;

const config = parseArgs(helpText);
if (config) {
    runMergeDocxToPdf(config);
}