import { request } from '@/services/fetch'
import { IndexedDatabaseConnector } from '@/services/idb'
import {
  User,
  UserController,
  UserCreateDTO,
} from '@/sky-shared/controllers/user.controller'
import { SessionPayload } from '@/sky-shared/session'

import { wrapControllerFunction } from './controller-wrapper'

export const UserDatabase = new IndexedDatabaseConnector<User>('users', {
  _id: '_id',
  username: 'username',
  updated: 'updated',
})

export const userController = new UserController(UserDatabase)

export const createUserOrLogin = wrapControllerFunction<UserCreateDTO, string>(
  (body) => userController.create({ body }),
  (body) =>
    request('/api/user', {
      method: 'POST',
      body,
    }),
)

export const getUser = wrapControllerFunction<
  { _id: string; session: SessionPayload },
  User
>(
  (body) =>
    userController.get({
      parameters: {
        user: body._id,
      },
      session: body.session,
    }),
  (body) => request('/api/user/' + body._id),
)
