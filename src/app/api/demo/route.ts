import { enterDemo, leaveDemo } from '@/lib/panel-context'

export async function POST() {
  await enterDemo()

  return new Response(null, { status: 204 })
}

export async function DELETE() {
  await leaveDemo()

  return new Response(null, { status: 204 })
}
