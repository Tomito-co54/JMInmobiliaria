/**
 * Inline error message for forms.
 * Small, red, accessible.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

/**
 * Banner-style error for top of form (e.g., server-side errors).
 */
export function FormErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2"
      role="alert"
    >
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
