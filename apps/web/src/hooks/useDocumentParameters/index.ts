import { useCallback, useMemo } from 'react'

import { recalculateInputs } from '$/hooks/useDocumentParameters/recalculateInputs'
import {
  DatasetVersion,
  DocumentLog,
  DocumentVersion,
  INPUT_SOURCE,
  Inputs,
  InputSource,
  LinkedDataset,
  LinkedDatasetRow,
  LocalInputs,
  LocalInputSource,
  PlaygroundInput,
  PlaygroundInputs,
} from '@latitude-data/core/browser'
import type { ConversationMetadata } from 'promptl-ai'
import {
  AppLocalStorage,
  useCurrentProject,
  useLocalStorage,
} from '@latitude-data/web-ui'
import useDocumentVersions from '$/stores/documentVersions'

const EMPTY_LINKED_DATASET = {
  rowIndex: 0,
  inputs: {} as LinkedDataset['inputs'],
  mappedInputs: {} as LinkedDataset['mappedInputs'],
}

const EMPTY_LINKED_DATASET_ROW: LinkedDatasetRow = {
  datasetRowId: 0, // This is wrong. This is an ID in DB. But allows to have this attribute as non optional
  mappedInputs: {} as LinkedDatasetRow['mappedInputs'],
}

const EMPTY_INPUTS: PlaygroundInputs<'manual'> = {
  source: INPUT_SOURCE.manual,
  manual: { inputs: {} },
  dataset: {
    datasetId: undefined,
    ...EMPTY_LINKED_DATASET_ROW,
    // DEPRECATED: Remove after a dataset V2 migration
    ...EMPTY_LINKED_DATASET,
  },
  history: { logUuid: undefined, inputs: {} },
}

function convertToParams(inputs: Inputs<InputSource>) {
  return Object.fromEntries(
    Object.entries(inputs).map(([key, input]) => {
      try {
        return [key, JSON.parse(input.value)]
      } catch (e) {
        return [key, input?.value?.toString?.()]
      }
    }),
  )
}

function getDocState(oldState: InputsByDocument | null, key: string) {
  const state = oldState ?? {}
  const doc = state[key] ?? EMPTY_INPUTS
  return { state, doc }
}

function getValue({ paramValue }: { paramValue: unknown | undefined }) {
  try {
    const value =
      typeof paramValue === 'string' ? paramValue : JSON.stringify(paramValue)
    return { value, metadata: { includeInPrompt: paramValue !== undefined } }
  } catch {
    return { value: '', metadata: { includeInPrompt: false } }
  }
}

function mapLogParametersToInputs({
  inputs,
  parameters,
}: {
  inputs: Inputs<'history'>
  parameters: DocumentLog['parameters'] | undefined
}): Inputs<'history'> | undefined {
  const params = parameters ?? {}
  // No parameters
  if (!Object.keys(params).length) return undefined

  return Object.entries(inputs).reduce((acc, [key]) => {
    acc[key] = getValue({ paramValue: params[key] })
    return acc
  }, {} as Inputs<'history'>)
}

type InputsByDocument = Record<string, PlaygroundInputs<InputSource>>

function getLinkedDataset<V extends DatasetVersion = DatasetVersion>({
  document,
  localInputs,
  datasetVersion,
}: {
  document: DocumentVersion
  localInputs: PlaygroundInputs<'dataset', V>['dataset']
  datasetVersion: V
}) {
  const datasetId = document.datasetId
  if (!datasetId) {
    if (datasetVersion === DatasetVersion.V1) return EMPTY_LINKED_DATASET
    return EMPTY_LINKED_DATASET_ROW
  }

  const isV1 = datasetVersion === DatasetVersion.V1
  let all = isV1
    ? (document.linkedDataset ?? {})
    : (document.linkedDatasetAndRow ?? {})

  if (!isV1) {
    console.log('IS_V2')
  }
  const isEmpty = Object.keys(all).length === 0

  if (isEmpty) {
    let whenEmptyData = {
      inputs: localInputs.inputs,
      mappedInputs: localInputs.mappedInputs,
    }
    return isV1
      ? { ...whenEmptyData, rowIndex: 0 }
      : { ...whenEmptyData, datasetRowId: 0 }
  }

  return all[datasetId]
    ? all[datasetId]
    : isV1
      ? EMPTY_LINKED_DATASET
      : EMPTY_LINKED_DATASET_ROW
}

export function useDocumentParameters<
  V extends DatasetVersion = DatasetVersion,
>({
  document,
  commitVersionUuid,
  datasetVersion,
}: {
  document: DocumentVersion
  datasetVersion: V
  commitVersionUuid: string
}) {
  const { project } = useCurrentProject()
  const projectId = project.id
  const commitUuid = commitVersionUuid
  const { saveLinkedDataset } = useDocumentVersions({
    projectId,
    commitUuid,
  })
  // TODO: Delete stale inputs as new inputs could eventually not fit
  const { value: allInputs, setValue } = useLocalStorage<InputsByDocument>({
    key: AppLocalStorage.playgroundParameters,
    defaultValue: {},
  })
  const key = `${commitVersionUuid}:${document.documentUuid}`
  const inputs = allInputs[key] ?? EMPTY_INPUTS
  const source = inputs.source
  const linkedDataset = getLinkedDataset<V>({
    document,
    // @ts-expect-error - This will fixed after migration to dataset V2
    localInputs: inputs.dataset,
    datasetVersion,
  })

  let inputsBySource =
    source === INPUT_SOURCE.dataset
      // TODO: remove after datasets 2 migration
      ? (linkedDataset as LinkedDataset).inputs
      : inputs[source].inputs

  console.log("LINKED_DATASET", linkedDataset)

  const setInputs = useCallback(
    <S extends LocalInputSource>(source: S, newInputs: LocalInputs<S>) => {
      setValue((oldState) => {
        const { state, doc } = getDocState(oldState, key)

        const prevSource = doc[source]

        return {
          ...state,
          [key]: {
            ...doc,
            [source]: {
              ...prevSource,
              inputs: newInputs,
            },
          },
        }
      })
    },
    [allInputs, key, source, setValue],
  )

  const setManualInputs = useCallback(
    (newInputs: Inputs<'manual'>) => setInputs(INPUT_SOURCE.manual, newInputs),
    [setInputs],
  )

  const setHistoryInputs = useCallback(
    (newInputs: Inputs<'history'>) =>
      setInputs(INPUT_SOURCE.history, newInputs),
    [setInputs],
  )

  const setInput = useCallback(
    <S extends InputSource>(
      source: S,
      value: PlaygroundInput<S>,
      param: string,
    ) => {
      inputs
      switch (source) {
        case INPUT_SOURCE.manual:
          setManualInputs({ ...inputsBySource, [param]: value })
          break
        case INPUT_SOURCE.history:
          setHistoryInputs({ ...inputsBySource, [param]: value })
          break
      }
    },
    [source, inputsBySource, setInputs],
  )

  const setManualInput = useCallback(
    (param: string, value: PlaygroundInput<'manual'>) => {
      setInput(source, value, param)
    },
    [setInput],
  )

  const setHistoryInput = useCallback(
    (param: string, value: PlaygroundInput<'history'>) => {
      setInput(source, value, param)
    },
    [setInput, source],
  )

  const setSource = useCallback(
    (source: InputSource) => {
      setValue((prev) => {
        const { state, doc } = getDocState(prev, key)
        return {
          ...state,
          [key]: {
            ...doc,
            source,
          },
        }
      })
    },
    [key, setValue],
  )

  const copyDatasetInputsToManual = useCallback(() => {
    if (!linkedDataset?.inputs) return

    setManualInputs(linkedDataset.inputs)
  }, [linkedDataset?.inputs, inputs])

  const setHistoryLog = useCallback(
    (logUuid: string) => {
      setValue((old) => {
        const { state, doc } = getDocState(old, key)
        return {
          ...state,
          [key]: {
            ...doc,
            history: {
              ...doc.history,
              logUuid,
            },
          },
        }
      })
    },
    [allInputs, key, setValue],
  )

  const mapDocParametersToInputs = useCallback(
    ({ parameters }: { parameters: DocumentLog['parameters'] }) => {
      const state = allInputs[key]
      if (!state) return

      const docState = state.history
      const sourceInputs = docState.inputs
      const newInputs = mapLogParametersToInputs({
        inputs: sourceInputs,
        parameters,
      })

      if (!newInputs) return

      setInputs('history', newInputs)
    },
    [inputs, key, setInputs],
  )

  const setDataset = useCallback(
    async ({
      datasetId,
      datasetVersion,
      data,
    }: {
      datasetId: number
      data: LinkedDataset
      datasetVersion: DatasetVersion
    }) => {
      await saveLinkedDataset({
        projectId,
        commitUuid,
        documentUuid: document.documentUuid,
        datasetId,
        datasetVersion,
        inputs: data.inputs,
        mappedInputs: data.mappedInputs,
        rowIndex: data.rowIndex,
      })
    },
    [saveLinkedDataset, projectId, commitUuid, document.documentUuid],
  )

  const setDatasetV2 = useCallback(
    async ({
      datasetId,
      data,
    }: {
      datasetId: number
      data: LinkedDatasetRow
    }) => {
      await saveLinkedDataset({
        projectId,
        commitUuid,
        documentUuid: document.documentUuid,
        datasetId,
        datasetVersion,
        mappedInputs: data.mappedInputs,
        datasetRowId: data.datasetRowId,
      })
    },
    [saveLinkedDataset, projectId, commitUuid, document.documentUuid],
  )

  const onMetadataProcessed = useCallback(
    (metadata: ConversationMetadata) => {
      setInputs(
        'manual',
        recalculateInputs({
          inputs: inputs.manual.inputs,
          metadata,
        }),
      )

      // TODO: Remove after a dataset V2 migration
      if (document.datasetId && linkedDataset && 'inputs' in linkedDataset) {
        const datasetInputs = recalculateInputs<'dataset'>({
          inputs: linkedDataset.inputs,
          metadata,
        })

        if (
          datasetVersion === DatasetVersion.V1 &&
          'rowIndex' in linkedDataset
        ) {
          setDataset({
            datasetId: document.datasetId,
            datasetVersion,
            data: {
              inputs: datasetInputs,
              mappedInputs: linkedDataset.mappedInputs,
              rowIndex: linkedDataset.rowIndex,
            } as LinkedDataset,
          })
        }
      }

      setInputs(
        'history',
        recalculateInputs({
          inputs: inputs.history.inputs,
          metadata,
        }),
      )
    },
    [
      inputs,
      setInputs,
      source,
      document.datasetId,
      linkedDataset,
      datasetVersion,
    ],
  )

  const parameters = useMemo(
    () => convertToParams(inputsBySource),
    [inputsBySource],
  )

  return {
    parameters,
    onMetadataProcessed,
    source,
    setSource,
    setInput,
    manual: {
      inputs: inputs['manual'].inputs,
      setInput: setManualInput,
      setInputs: setManualInputs,
    },
    dataset: {
      datasetId: document.datasetId,
      datasetRowId:
        linkedDataset && 'datasetRowId' in linkedDataset
          ? linkedDataset?.datasetRowId
          : undefined,
      // DEPRECATED: Remove after a dataset V2 migration
      rowIndex:
        linkedDataset && 'rowIndex' in linkedDataset
          ? linkedDataset?.rowIndex
          : undefined,
      mappedInputs: linkedDataset?.mappedInputs,
      // @ts-expect-error - This will fixed after migration to dataset V2
      inputs: linkedDataset?.inputs,
      setDataset,
      setDatasetV2,
      copyToManual: copyDatasetInputsToManual,
    },
    history: {
      logUuid: inputs['history'].logUuid,
      inputs: inputs['history'].inputs,
      setInput: setHistoryInput,
      setInputs: setHistoryInputs,
      setHistoryLog,
      mapDocParametersToInputs,
    },
  }
}
