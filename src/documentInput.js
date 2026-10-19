const MAX_INPUT_BYTES = 1024 * 1024;

/** Read one bounded UTF-8 document without silently replacing invalid bytes. */
export async function readDocumentSource(stream) {
  const buffer = Buffer.alloc(MAX_INPUT_BYTES);
  let total = 0;
  for await (const chunk of stream) {
    if (!(chunk instanceof Uint8Array)) throw new TypeError('DOCUMENT_INPUT_INVALID');
    if (chunk.byteLength > MAX_INPUT_BYTES - total) {
      // Retain the existing CLI error code for both file and piped input.
      throw new RangeError('DOCUMENT_FILE_TOO_LARGE');
    }
    buffer.set(chunk, total);
    total += chunk.byteLength;
  }
  try {
    // Keep a BOM visible to JSON.parse, matching the existing file contract.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
      .decode(buffer.subarray(0, total));
  } catch {
    throw new TypeError('DOCUMENT_INPUT_INVALID');
  }
}
