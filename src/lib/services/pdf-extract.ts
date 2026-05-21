import { extractText } from "unpdf";

export async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const { text } = await extractText(buffer, { mergePages: true });
  return text.trim();
}
