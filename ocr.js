const { createWorker } = require('tesseract.js');

async function extractText(imageBuffer) {
  try {
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    return null;
  }
}

module.exports = { extractText };
