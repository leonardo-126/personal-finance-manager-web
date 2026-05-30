import { ApiError } from "@/lib/api";

export type FieldErrors = Record<string, string[]>;

export function extractFieldErrors(err: unknown): FieldErrors {
  if (err instanceof ApiError && err.status === 422) {
    const data = err.data as { errors?: FieldErrors } | null;
    return data?.errors ?? {};
  }
  return {};
}

export function firstFieldError(
  errors: FieldErrors,
  field: string
): string | undefined {
  return errors[field]?.[0];
}
