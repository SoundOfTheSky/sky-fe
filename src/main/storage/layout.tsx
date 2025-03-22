import { ParentComponent } from 'solid-js'

import Auth from '@/components/auth'

import { StorageProvider } from './storage.context'

const Layout: ParentComponent = (properties) => {
  return (
    <Auth>
      <StorageProvider>{properties.children}</StorageProvider>
    </Auth>
  )
}
export default Layout
