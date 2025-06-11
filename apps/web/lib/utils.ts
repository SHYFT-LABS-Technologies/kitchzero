export function cn(...inputs: (string | undefined)[]): string {
  return inputs.filter(Boolean).join(' ')
}

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'An unknown error occurred'
}