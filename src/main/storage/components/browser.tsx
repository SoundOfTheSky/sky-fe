import {
  mdiAccountConvert,
  mdiCopyleft,
  mdiDelete,
  mdiFile,
  mdiFileDownloadOutline,
  mdiFileMove,
  mdiFileUpload,
  mdiFolder,
  mdiFolderPlus,
  mdiFolderUpload,
  mdiRename,
} from '@mdi/js'
import {
  concurrentRun,
  formatBytes,
  formatNumber,
  noop,
  retry,
  SpeedCalculator,
} from '@softsky/utils'
import { useLocation, useNavigate } from '@solidjs/router'
import { Component, createMemo, createResource, For } from 'solid-js'

import Icon from '@/components/icon'
import { modalsStore, Severity } from '@/services/modals.store'
import { atom, useGlobalEvent } from '@/services/reactive'
import { getDefaultRestFields } from '@/services/rest'
import { StorageFileStatus } from '@/sky-shared/storage'

import { RESTStorageEndpoint, RESTStorageFile } from '../services/storage.rest'
// eslint-disable-next-line import-x/default
import StorageWorker from '../services/storage.worker.ts?worker'

import ActionButton from './action-button'
import TableSortingColumn from './table-sorting-column'

import s from './browser.module.scss'

/**
 * - /abc
 * - /
 * - /asdas dsf/123 sdf.png
 */
const IGNORED_FILES = new Set(['.DS_Store'])
export enum ACTIONS {
  MOVE,
  COPY,
  HERE,
  RENAME,
  DELETE,
  CREATEFOLDER,
  UPLOADFILE,
  UPLOADDIRECTORY,
  CONVERT,
}
export default (() => {
  // === Hooks ===
  const location = useLocation()
  const navigate = useNavigate()
  useGlobalEvent('dragover', (event) => {
    event.preventDefault()
  })
  useGlobalEvent('drop', (event) => {
    event.preventDefault()
    const items = event.dataTransfer?.items
    if (!items || items.length === 0) return
    void uploadFiles(
      [...items]
        .filter((x) => x.kind === 'file')
        .map((x) => x.getAsFile())
        .filter((x) => x && !IGNORED_FILES.has(x.name)) as File[],
    )
  })

  // === State ===
  const lastSelectionIndex = atom(0)
  const selection = atom<RESTStorageFile[]>([])
  const sortingField = atom('name')
  const sortingAsc = atom(true)
  const bufferFiles = atom<number[]>([])
  const isCopy = atom(false)

  // === Memos ===
  const directoryPath = createMemo(() => location.pathname.slice(9))
  const [files, { refetch: refetchFiles }] = createResource(
    directoryPath,
    (path) =>
      RESTStorageEndpoint.getInFolder(path, {
        ignoreDB: true,
      }),
    {
      initialValue: [],
    },
  )
  const filesView = createMemo(() => {
    const $files = [...files()]
    const $sortingField = sortingField()
    switch ($sortingField) {
      case 'name':
      case 'path': {
        $files.sort((a, b) =>
          a.data[$sortingField].localeCompare(b.data[$sortingField]),
        )
        break
      }
      case 'created':
      case 'updated': {
        $files.sort(
          (a, b) => a[$sortingField].getTime() - b[$sortingField].getTime(),
        )
        break
      }
      case 'size': {
        $files.sort((a, b) => a.data[$sortingField] - b.data[$sortingField])
        break
      }
    }
    if (sortingAsc()) $files.reverse()
    // Folders on top
    $files.sort((a, b) => b.data.status - a.data.status)
    return $files
  })
  const actions = createMemo(
    () => {
      const $selection = selection()
      const $bufferFiles = bufferFiles()
      if ($selection.length === 0)
        new Set([
          ACTIONS.UPLOADFILE,
          ACTIONS.UPLOADDIRECTORY,
          ACTIONS.CREATEFOLDER,
        ])
      const actions = new Set([
        ACTIONS.DELETE,
        ACTIONS.COPY,
        ACTIONS.MOVE,
        ACTIONS.CONVERT,
      ])
      if ($selection.length === 1) actions.add(ACTIONS.RENAME)
      if ($bufferFiles.length > 0) actions.add(ACTIONS.HERE)
      return actions
    },
    {
      initialValue: [
        ACTIONS.UPLOADFILE,
        ACTIONS.UPLOADDIRECTORY,
        ACTIONS.CREATEFOLDER,
      ],
    },
  )

  // === Functions ===

  function fileClick(event: MouseEvent, index: number) {
    const $lastSelectionIndex = lastSelectionIndex()
    const file = filesView()[index]!
    if (event.shiftKey)
      // eslint-disable-next-line solid/reactivity
      selection((x) => [
        ...new Set([...x, ...filesView().slice($lastSelectionIndex, index)]),
      ])
    else if (event.ctrlKey || event.metaKey) {
      if (selection().includes(file))
        selection((x) => x.filter((x) => x !== file))
      else selection((x) => [...x, file])
    } else selection([file])
    lastSelectionIndex(index)
  }

  function fileDblClick(file: RESTStorageFile) {
    if (file.data.status === StorageFileStatus.FOLDER)
      navigate(
        `/storage/${file.data.path ? file.data.path + '/' : ''}${file.data.name}`,
      )
    else {
      const a = document.createElement('a')
      a.href = `/api/storage/binary?id=${file.data.id}`
      a.download = file.data.name
      a.click()
    }
  }

  function selectFileDialog(directory?: boolean) {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.multiple = true
    if (directory) fileInput.webkitdirectory = true
    fileInput.addEventListener(
      'change',
      (event) => {
        const files = (event.target as HTMLInputElement).files
        if (!files) return
        void uploadFiles([...files].filter((x) => !IGNORED_FILES.has(x.name)))
      },
      {
        once: true,
        passive: true,
      },
    )
    fileInput.click()
  }

  function createFolder(name = 'New folder') {
    let index = 1
    while (true) {
      if (files().some((x) => x.data.name === name)) {
        name = 'New folder ' + index
        index++
      } else break
    }
    //     new RESTStorageFile({
    //           ...getDefaultRestFields(),
    // name,
    // path:
    //     })
  }

  async function deleteFiles() {
    for (const file of selection()) {
      await file.delete()
    }
  }

  async function uploadFiles(files: File[]) {
    const workers = Array.from(
      { length: Math.min(navigator.hardwareConcurrency || 4, files.length) },
      () => new StorageWorker(),
    )
    const combinedSize = files.reduce<number>((sum, file) => sum + file.size, 0)
    let speedCalculator = new SpeedCalculator(combinedSize, 15_000)
    let uploading = false
    const notificationId = 'STORAGE_UPLOAD'
    modalsStore.notify({
      id: notificationId,
      title: 'Starting uploading',
      severity: Severity.INFO,
      progress: 0.01,
    })
    const interval = setInterval(() => {
      modalsStore.notifications((notifications) =>
        notifications.map((notification) =>
          notification.id === 'STORAGE_UPLOAD'
            ? {
                id: notificationId,
                title: `${uploading ? 'Uploading' : 'Hashing'} files ${formatBytes(
                  Math.trunc(speedCalculator.sum),
                )}/${formatBytes(combinedSize)} Speed ${formatBytes(
                  Math.trunc(speedCalculator.stats.speed),
                )}/s ${formatNumber(speedCalculator.stats.eta) || '<1s'} left`,
                severity: Severity.INFO,
                progress: speedCalculator.stats.percent,
              }
            : notification,
        ),
      )
    }, 100)
    try {
      const hashes = await concurrentRun<string>(
        files.map(
          (file) => () =>
            new Promise((resolve, reject) => {
              const worker = workers.pop()!
              worker.postMessage(['hash', file])
              // eslint-disable-next-line unicorn/prefer-add-event-listener
              worker.onmessage = (
                event: MessageEvent<['hashChunk', number] | ['hash', string]>,
              ) => {
                if (event.data[0] === 'hashChunk')
                  speedCalculator.push(event.data[1])
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                else if (event.data[0] === 'hash') {
                  workers.push(worker)
                  resolve(event.data[1])
                }
              }
              // eslint-disable-next-line unicorn/prefer-add-event-listener
              worker.onerror = reject
            }),
        ),
        workers.length,
      )
      speedCalculator = new SpeedCalculator(combinedSize, 15_000)
      uploading = true
      for (let index = 0; index < files.length; index++) {
        const sum = speedCalculator.sum
        const file = files[index]!
        try {
          const storageFile = await new RESTStorageFile({
            ...getDefaultRestFields(),
            hash: hashes[index]!,
            name: file.name,
            path: file.webkitRelativePath.slice(
              0,
              file.webkitRelativePath.lastIndexOf('/'),
            ),
            size: file.size,
            status: StorageFileStatus.NOT_UPLOADED,
          }).create()
          if (storageFile.data.status === StorageFileStatus.NOT_UPLOADED) {
            await retry(
              async () => {
                speedCalculator.sum = sum
                await storageFile.uploadBinary(file, speedCalculator)
              },
              6,
              1000,
            )
          } else speedCalculator.push(file.size)
        } catch (error) {
          speedCalculator.sum = sum + file.size
          console.error(error)
          modalsStore.notify({
            title: `Couldn't upload ${file.webkitRelativePath}`,
            severity: Severity.ERROR,
            timeout: 10_000,
          })
        }
      }
    } catch (error) {
      console.error(error)
      modalsStore.notify({
        title: `Couldn't calculate hash`,
        timeout: 10_000,
      })
    } finally {
      modalsStore.notifications((x) => x.filter((x) => x.id !== notificationId))
      clearInterval(interval)
      for (const worker of workers) worker.terminate()
      await refetchFiles()
    }
  }

  return (
    <div class={`card ${s.browser}`}>
      <div class={s.buttons}>
        <ActionButton
          action={ACTIONS.UPLOADFILE}
          icon={mdiFileUpload}
          onClick={selectFileDialog}
          tooltip='Upload file'
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.UPLOADDIRECTORY}
          icon={mdiFolderUpload}
          onClick={() => {
            selectFileDialog(true)
          }}
          tooltip='Upload folder'
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.CREATEFOLDER}
          icon={mdiFolderPlus}
          onClick={createFolder}
          tooltip='Create folder'
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.RENAME}
          icon={mdiRename}
          onClick={noop}
          tooltip='Rename'
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.DELETE}
          icon={mdiDelete}
          onClick={deleteFiles}
          tooltip='Delete'
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.MOVE}
          icon={mdiFileMove}
          onClick={noop}
          tooltip='Move'
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.COPY}
          icon={mdiCopyleft}
          onClick={noop}
          tooltip='Copy'
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.HERE}
          icon={mdiFileDownloadOutline}
          onClick={noop}
          tooltip={isCopy() ? 'Copy here' : 'Move here'}
          actions={actions()}
        />
        <ActionButton
          action={ACTIONS.CONVERT}
          icon={mdiAccountConvert}
          onClick={noop}
          tooltip='Convert'
          actions={actions()}
        />
      </div>
      <table class={s.table}>
        <thead>
          <tr>
            <th>Icon</th>
            <TableSortingColumn
              name='name'
              sortingAsc={sortingAsc}
              sortingField={sortingField}
            >
              Name
            </TableSortingColumn>
            <TableSortingColumn
              name='size'
              sortingAsc={sortingAsc}
              sortingField={sortingField}
            >
              Size
            </TableSortingColumn>
            <TableSortingColumn
              name='created'
              sortingAsc={sortingAsc}
              sortingField={sortingField}
            >
              Created
            </TableSortingColumn>
            <TableSortingColumn
              name='updated'
              sortingAsc={sortingAsc}
              sortingField={sortingField}
            >
              Updated
            </TableSortingColumn>
          </tr>
        </thead>
        <tbody>
          <For each={filesView()}>
            {(file, index) => (
              <tr
                onClick={(event) => {
                  fileClick(event, index())
                }}
                onDblClick={() => {
                  fileDblClick(file)
                }}
                classList={{
                  [s.selected!]: selection().includes(file),
                }}
              >
                <td>
                  <Icon
                    path={
                      file.data.status === StorageFileStatus.FOLDER
                        ? mdiFolder
                        : mdiFile
                    }
                    size={24}
                  />
                </td>
                <td>{file.data.name}</td>
                <td>{formatBytes(file.data.size)}</td>
                <td>{file.created.toLocaleString()}</td>
                <td>{file.updated.toLocaleString()}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )
}) as Component
