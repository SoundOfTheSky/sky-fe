import { Sha256 } from '@aws-crypto/sha256-js'

onmessage = async (event: MessageEvent<['hash', File]>) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (event.data[0] === 'hash') {
    const reader = event.data[1].stream().getReader()
    const hasher = new Sha256()
    while (true) {
      const { value } = await reader.read()
      if (!value) break
      hasher.update(value)
      postMessage(['hashChunk', value.length])
    }
    postMessage([
      'hash',
      btoa(String.fromCharCode(...(await hasher.digest())))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, ''),
    ])
  }
}
