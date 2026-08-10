import { leaveShare } from '@/lib/panel-context'

// Closing a shared view only drops the reader's own cookie, so it asks for nothing, the same way
// leaving the example patient does. Opening one happens through the link itself, never here.
export async function DELETE() {
  await leaveShare()

  return new Response(null, { status: 204 })
}
