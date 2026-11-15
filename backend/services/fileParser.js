import pdfParse from 'pdf-parse';

// Extract readable text from an uploaded file buffer based on its extension
export async function parseFileContent(buffer, originalName) {
  // Get file extension in lowercase (e.g., 'pdf', 'md', 'txt')
  const extension = originalName.split('.').pop().toLowerCase();

  // If file is a PDF, parse it with pdf-parse library
  if (extension === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text; // Extracted raw text from PDF pages
  }

  // If file is Markdown (.md) or plain text (.txt), convert byte buffer to string
  if (extension === 'md' || extension === 'txt') {
    return buffer.toString('utf-8');
  }

  // Fallback for any other plain text document format
  return buffer.toString('utf-8');
}
