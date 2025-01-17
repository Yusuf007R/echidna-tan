import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/test')({
  component: RouteComponent,
})

function RouteComponent() {
  return 'Hello /_authed/test!'
}
