import {
  DatabaseConnector,
  DefaultSchema,
  QueryKeys,
} from '@/sky-shared/database'

import { request } from '../fetch'

import { LocalDatabaseConnector } from './local'
import { RemoteDatabaseConnector } from './remote'

export class MixedDatabaseConnector<T extends DefaultSchema>
  implements DatabaseConnector<T>
{
  public constructor(
    public local: LocalDatabaseConnector<T>,
    public remote: RemoteDatabaseConnector<T>,
    public isOnline: () => boolean,
    public remoteFirst?: boolean
  ) {}

  public get(_id: string): Promise<T | undefined> {
    if(this.isOnline()) {
      
    }
  }

  public async create(data: T): Promise<void> {
    await request(this.url, {
      body: data,
      method: 'POST',
    })
  }

  public async createMany(data: T[]): Promise<void> {
    await request(this.url, {
      body: data,
      method: 'POST',
    })
  }

  public async delete(_id: string): Promise<void> {
    await request(this.url + '/' + _id, {
      method: 'DELETE',
    })
  }

  public async deleteMany(query: QueryKeys<T>, _index?: string): Promise<void> {
    await request(this.url, {
      method: 'DELETE',
      query: query as Record<string, string>,
    })
  }

  public async *cursor(
    query: QueryKeys<T>,
    _index?: string,
  ): AsyncGenerator<T> {
    const items = await request<T[]>(this.url, {
      query: query as Record<string, string>,
    })
    for (let index = 0; index < items.length; index++) yield items[index]!
  }

  public getAll(query: QueryKeys<T>, _index?: string): Promise<T[]> {
    return request<T[]>(this.url, {
      query: query as Record<string, string>,
    })
  }

  public async update(_id: string, fields: Partial<T>): Promise<void> {
    await request(this.url + '/' + _id, {
      body: fields,
      method: 'PUT',
    })
  }

  public async updateMany(
    query: QueryKeys<T>,
    fields: Partial<T>,
    _index?: string,
  ): Promise<void> {
    await request(this.url, {
      body: fields,
      method: 'PUT',
      query: query as Record<string, string>,
    })
  }
}
