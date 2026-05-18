import { z } from "zod";

export function parseFormData<T extends z.ZodType>(
  formData: FormData,
  schema: T
): z.infer<T> {
  const obj: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) obj[key] = value;
  return schema.parse(obj);
}
