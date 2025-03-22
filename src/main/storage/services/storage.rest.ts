import { SpeedCalculator } from '@softsky/utils'

import { request } from '@/services/fetch'
import {
  getDefaultRestFields,
  RESTEndpointIDB,
  RESTItemIDB,
} from '@/services/rest'
import {
  StorageFile,
  StorageFileStatus,
  StorageFileT,
} from '@/sky-shared/storage'

export class RESTStorageFile extends RESTItemIDB<StorageFile> {
  public constructor(data: StorageFile) {
    super(data)
    this.endpoint = RESTStorageEndpoint
  }

  public uploadBinary(file: File, speedCalculator: SpeedCalculator<number>) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/storage/binary?id=' + this.data.id, true)
      let lastBytes = 0
      xhr.upload.addEventListener('progress', (event) => {
        speedCalculator.push(event.loaded - lastBytes)
        lastBytes = event.loaded
      })
      xhr.addEventListener('load', resolve)
      xhr.addEventListener('error', reject)
      xhr.send(file)
    })
  }

  public downloadBinary() {
    return request('/api/storage/binary', {
      query: {
        id: this.data.id.toString(),
      },
      raw: true,
    })
  }
}

export const RESTStorageEndpoint = new RESTEndpointIDB<
  StorageFile,
  RESTStorageFile
>('/api/storage/file', RESTStorageFile, StorageFileT, 'storageFiles')

export async function uploadFile(
  file: File,
  hash: string,
  speedCalculator: SpeedCalculator<number>,
) {
  const storageFile = new RESTStorageFile({
    ...getDefaultRestFields(),
    hash,
    name: file.name,
    path: '/',
    size: file.size,
    status: StorageFileStatus.NOT_UPLOADED,
  })
  await storageFile.create()
  if (storageFile.data.status === StorageFileStatus.NOT_UPLOADED)
    await storageFile.uploadBinary(file, speedCalculator)
  else speedCalculator.push(file.size)
}
