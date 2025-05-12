import { SpeedCalculator } from '@softsky/utils'

import { request } from '@/services/fetch'
import {
  getDefaultRestFields,
  RESTEndpointIDB,
  RESTItemIDB,
  RESTItemIDBRequestOptions,
  RESTItemIDBRequestOptionsWithQuery,
} from '@/services/rest'
import {
  StorageFile,
  StorageFileStatus,
  StorageFileT,
} from '@/sky-shared/storage'

export class RESTStorageFile extends RESTItemIDB<StorageFile, 'storageFiles'> {
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

  public async createFoldersForPath() {
    if (!this.data.path) return
    const split = this.data.path.split('/')
    const name = split.at(-1)!
    const path = split.slice(0, -1).join('/')
    const file = await RESTStorageEndpoint.getByPath(path, name)
    if (!file)
      await new RESTStorageFile({
        ...getDefaultRestFields(),
        path,
        name,
        size: 0,
        status: StorageFileStatus.FOLDER,
      }).create()
    else if (file.data.status !== StorageFileStatus.FOLDER)
      throw new Error('Can not create folder')
  }

  public async create(options?: RESTItemIDBRequestOptions): Promise<this> {
    await this.createFoldersForPath()
    return super.create(options)
  }

  public async update(options?: RESTItemIDBRequestOptions): Promise<this> {
    await this.createFoldersForPath()
    return super.update(options)
  }

  public async delete(options?: RESTItemIDBRequestOptions): Promise<this> {
    for (const file of await this.getInFolder()) await file.delete()
    return super.delete(options)
  }

  public downloadBinary() {
    return request('/api/storage/binary', {
      query: {
        id: this.data.id.toString(),
      },
      raw: true,
    })
  }

  public async getInFolder() {
    if (this.data.status !== StorageFileStatus.FOLDER) return []
    return RESTStorageEndpoint.getInFolder(
      `${this.data.path}/${this.data.name}`,
    )
  }
}

export const RESTStorageEndpoint = new (class extends RESTEndpointIDB<
  StorageFile,
  RESTStorageFile,
  'storageFiles'
> {
  public async getByPath(
    path: string,
    name: string,
    options?: RESTItemIDBRequestOptionsWithQuery<'storageFiles'>,
  ) {
    const results = await this.getAll({
      query: {
        path,
      },
      dbquery: {
        index: 'path_name',
        value: [path, name],
      },
      ...options,
    })
    return results[0]
  }

  public async getInFolder(
    path: string,
    options?: RESTItemIDBRequestOptionsWithQuery<'storageFiles'>,
  ) {
    return this.getAll({
      query: {
        path: path,
      },
      dbquery: {
        index: 'path',
        value: path,
      },
      ...options,
    })
  }
})('/api/storage/file', RESTStorageFile, StorageFileT, 'storageFiles')
