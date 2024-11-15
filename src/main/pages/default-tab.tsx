import { useNavigate } from '@solidjs/router'

export default function DefaultTab() {
  const nav = useNavigate()
  nav('/study')
  return <div class="card-container" />
}
