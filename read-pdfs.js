const fs = require('fs');
const pdf = require('pdf-parse');

async function readPdfs() {
    try {
        const file1 = fs.readFileSync('15. RIPPPGaceta.pdf');
        const data1 = await pdf(file1);
        console.log('=== 15. RIPPPGaceta.pdf ===');
        console.log(data1.text.substring(0, 1500)); // First 1500 chars

        const file2 = fs.readFileSync('9. RRPAPTAMEGaceta197.pdf');
        const data2 = await pdf(file2);
        console.log('\n=== 9. RRPAPTAMEGaceta197.pdf ===');
        console.log(data2.text.substring(0, 1500)); // First 1500 chars
    } catch (e) {
        console.error('Error reading PDFs:', e);
    }
}

readPdfs();
