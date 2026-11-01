export const SESSION_TRANSITION_MIN_DURATION_MS = 900;

export async function waitForSessionTransition(
  startedAt: number,
): Promise<void> {
  const elapsed = Date.now() - startedAt;
  const remaining = SESSION_TRANSITION_MIN_DURATION_MS - elapsed;

  if (remaining <= 0) return;

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, remaining);
  });
}
