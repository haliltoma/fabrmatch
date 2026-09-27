import redis from '@adonisjs/redis/services/main'

/** How long a presigned upload may take to be registered (the URL itself lives 15 minutes). */
const TICKET_TTL_SECONDS = 20 * 60

interface Ticket {
  userId: number
  sizeBytes: number
}

/**
 * The storage key a presign handed out, bound to the user and the declared size. Registration
 * accepts only a live ticket, once, so a client cannot register someone else's object (or any
 * key it made up) and read it back through the preview URL (business rule 4).
 */
export default class UploadTicketService {
  private key(storageKey: string) {
    return `upload-ticket:${storageKey}`
  }

  async issue(storageKey: string, ticket: Ticket) {
    await redis.set(this.key(storageKey), JSON.stringify(ticket), 'EX', TICKET_TTL_SECONDS)
  }

  /** True when this user holds the ticket for this key and size; it is spent on success. */
  async consume(storageKey: string, userId: number, sizeBytes: number): Promise<boolean> {
    const raw = await redis.get(this.key(storageKey))
    if (!raw) return false
    const ticket = JSON.parse(raw) as Ticket
    if (ticket.userId !== userId || ticket.sizeBytes !== sizeBytes) return false
    // the delete decides between two concurrent registrations of the same key
    return (await redis.del(this.key(storageKey))) === 1
  }
}
