/** Workflow hataları her zaman `Error` örneği değil; loglarda `[object Object]` yerine mesajı gösterir. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message)
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
