import {
  mdiFile,
  mdiFileUpload,
  mdiFolder,
  mdiFolderPlus,
  mdiFolderUpload,
} from '@mdi/js'
import {
  binarySearch,
  concurrentRun,
  formatBytes,
  formatNumber,
  SpeedCalculator,
} from '@softsky/utils'
import { useLocation, useNavigate } from '@solidjs/router'
import { Component, createMemo, createResource, For } from 'solid-js'

import Icon from '@/components/icon'
import Tooltip from '@/components/tooltip'
import { modalsStore, Severity } from '@/services/modals.store'
import { atom, useGlobalEvent } from '@/services/reactive'
import { StorageFileStatus } from '@/sky-shared/storage'

import {
  RESTStorageEndpoint,
  RESTStorageFile,
  uploadFile,
} from '../services/storage.rest'
// eslint-disable-next-line import-x/default
import StorageWorker from '../services/storage.worker.ts?worker'

import s from './browser.module.scss'

/**
 * - /abc
 * - /
 * - /asdas dsf/123 sdf.png
 */
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
        .filter(Boolean) as File[],
    )
  })
  // === State ===
  const [files, { refetch: refetchFiles }] = createResource(() =>
    RESTStorageEndpoint.getAll({
      query: {
        'sort+': 'path',
      },
    }),
  )
  const lastSelectionIndex = atom(0)
  const selection = atom<number[]>([])

  // === Memos ===
  const directoryPath = createMemo(() => location.pathname.slice(9))
  const directoryContent = createMemo(() => {
    const $files = files()
    if (!$files) return []
    const $directoryPath = directoryPath() || '/'
    const foundIndex = binarySearch($files.length, (index: number) =>
      $files[index]!.data.path.localeCompare($directoryPath),
    )
    if (foundIndex === -1) return []
    let minIndex = foundIndex
    let maxIndex = foundIndex
    // eslint-disable-next-line no-empty
    while (--minIndex >= 0 && $files[minIndex]!.data.path === $directoryPath) {}
    while (
      ++maxIndex < $files.length &&
      $files[maxIndex]!.data.path === $directoryPath
      // eslint-disable-next-line no-empty
    ) {}
    minIndex++
    maxIndex--
    return $files
      .slice(minIndex, maxIndex + 1)
      .filter((x) => x.data.status !== StorageFileStatus.NOT_UPLOADED)
  })

  function fileClick(event: MouseEvent, index: number) {
    const $lastSelectionIndex = lastSelectionIndex()
    if (event.shiftKey)
      // eslint-disable-next-line solid/reactivity
      selection((x) => [
        ...new Set([
          ...x,
          ...directoryContent()
            .slice($lastSelectionIndex, index)
            .map((x) => x.id),
        ]),
      ])
    else if (event.ctrlKey || event.metaKey) {
      const id = directoryContent()[index]!.id
      if (selection().includes(id)) selection((x) => x.filter((x) => x !== id))
      else selection((x) => [...x, id])
    } else selection([directoryContent()[index]!.id])
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
        void uploadFiles([...files])
      },
      {
        once: true,
        passive: true,
      },
    )
    fileInput.click()
  }

  function createFolder() {
    let index = 1
    let name = 'New folder'
    while (true) {
      if (directoryContent().some((x) => x.data.name === name)) {
        name = 'New folder ' + index
        index++
      } else break
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
      for (let index = 0; index < files.length; index++)
        await uploadFile(files[index]!, hashes[index]!, speedCalculator)
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
        <Tooltip content='Upload'>
          <button
            class='button'
            onClick={() => {
              selectFileDialog()
            }}
          >
            <Icon path={mdiFileUpload} size='24' />
          </button>
        </Tooltip>
        <Tooltip content='Upload folder'>
          <button
            class='button'
            onClick={() => {
              selectFileDialog(true)
            }}
          >
            <Icon path={mdiFolderUpload} size='24' />
          </button>
        </Tooltip>
        <Tooltip content='Create folder'>
          <button
            class='button'
            onClick={() => {
              createFolder()
            }}
          >
            <Icon path={mdiFolderPlus} size='24' />
          </button>
        </Tooltip>
      </div>
      <table class={s.table}>
        <thead>
          <tr>
            <th>Icon</th>
            <th>Name</th>
            <th>Size</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          <For each={directoryContent()}>
            {(file, index) => (
              <tr
                onClick={(event) => {
                  fileClick(event, index())
                }}
                onDblClick={() => {
                  fileDblClick(file)
                }}
                classList={{
                  [s.selected!]: selection().includes(file.id),
                }}
              >
                <td>
                  <Icon
                    path={
                      file.data.status === StorageFileStatus.FOLDER
                        ? mdiFolder
                        : mdiFile
                    }
                    size={12}
                  />
                </td>
                <td>
                  {file.data.path === '/' ? '/' : file.data.path + '/'}
                  {file.data.name}
                </td>
                <td>{formatBytes(file.data.size)}</td>
                <td>{file.created.toLocaleString()}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )
}) as Component
