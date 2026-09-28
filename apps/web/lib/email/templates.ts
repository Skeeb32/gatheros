export type NotificationKind =
  "confirmation" | "reminder" | "cancellation" | "waitlist" | "announcement";
export function notificationTemplate(
  kind: NotificationKind,
  event: string,
  message = "",
) {
  const subjects: Record<NotificationKind, string> = {
    confirmation: `You're going to ${event}`,
    reminder: `See you at ${event}`,
    cancellation: `An update about ${event}`,
    waitlist: `New tickets for ${event}`,
    announcement: `News from ${event}`,
  };
  return {
    subject: subjects[kind],
    text:
      message ||
      `${subjects[kind]}. Visit your event page for the latest information.`,
  };
}
export interface EmailProvider {
  send(input: {
    to: string;
    subject: string;
    text: string;
    idempotencyKey: string;
  }): Promise<{ id: string }>;
}
// Existing ticket delivery uses Resend with database claims and idempotency.
// Operational campaigns remain reviewable drafts until a worker is configured.
