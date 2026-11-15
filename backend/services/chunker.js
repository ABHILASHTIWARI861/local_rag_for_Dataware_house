// Split a long document into smaller overlapping text chunks for local embedding
export function splitTextIntoChunks(text, chunkSize = 500, overlap = 100) {
  // Normalize Windows newlines (\r\n) and collapse excessive blank lines
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // If text is already shorter than our chunk size, return it as a single chunk
  if (cleanText.length <= chunkSize) {
    return cleanText ? [cleanText] : [];
  }

  const chunks = [];
  let startIndex = 0;

  // Slide through text creating chunks
  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;

    // Look for a space near the cutoff so we do not cut words in the middle
    if (endIndex < cleanText.length) {
      const nextSpace = cleanText.indexOf(' ', endIndex);
      if (nextSpace !== -1 && nextSpace - endIndex < 50) {
        endIndex = nextSpace; // Extend chunk to the end of the word
      }
    }

    // Extract the chunk string
    const chunk = cleanText.substring(startIndex, endIndex).trim();
    // Only keep chunks with meaningful text (more than 20 characters)
    if (chunk.length > 20) {
      chunks.push(chunk);
    }

    // Advance start position forward, minus overlap to maintain sentence context across boundaries
    startIndex += chunkSize - overlap;
  }

  return chunks;
}
