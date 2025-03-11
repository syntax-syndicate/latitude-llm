import useDatasetRows from '$/stores/datasetRows'
import { useCallback, useMemo, useRef, useState } from 'react'
import useDatasetRowsCount from '$/stores/datasetRowsCount'
import {
  DatasetV2,
  DatasetVersion,
  DocumentVersion,
  LinkedDatasetRow,
} from '@latitude-data/core/browser'
import {
  useDatasetRowWithPosition,
  type WithPositionData,
} from './useDatasetRowsWithPosition'
import { useDocumentParameters } from '$/hooks/useDocumentParameters'
import { SelectOption } from '@latitude-data/web-ui'
import { ConversationMetadata } from 'promptl-ai'
import { objectToString } from '@latitude-data/constants'

export type DatasetMappedValue = {
  param: string
  value: string
  columnIdentifier: string | undefined
  isMapped: boolean
  isEmpty: boolean
}

function getInitialPosition(
  selectedDatasetRowId: number | undefined,
): WithPositionData | undefined {
  return selectedDatasetRowId ? undefined : { position: 1, page: 1 }
}

/**
 * This hook is responsible of fetching the dataset rows and the
 * total amount of dataset rows for a dataset (v2).
 * This way we can paginate in document parameters all the rows
 */
export function useDatasetRowsForParameters({
  document,
  commitVersionUuid,
  dataset,
  enabled,
  metadata,
}: {
  document: DocumentVersion
  commitVersionUuid: string
  dataset: DatasetV2 | null | undefined
  enabled?: boolean
  metadata: ConversationMetadata | undefined
}) {
  const fetchedPosition = useRef(false)
  const rowCellOptions = useMemo<SelectOption<string>[]>(
    () =>
      dataset?.columns.map((c) => ({ value: c.identifier, label: c.name })) ??
      [],
    [dataset],
  )
  const { data: count, isLoading: isLoadingDatasetRowsCount } =
    useDatasetRowsCount({
      dataset: enabled && dataset ? dataset : undefined,
    })

  const {
    onParametersChange,
    datasetV2: { mappedInputs: mi, setDataset, datasetRowId },
  } = useDocumentParameters({
    document,
    commitVersionUuid,
    datasetVersion: DatasetVersion.V2,
  })
  const [selectedDatasetRowId, setSelectedDatasetRowId] = useState<
    number | undefined
  >(datasetRowId)

  const [position, setPosition] = useState<WithPositionData | undefined>(
    getInitialPosition(selectedDatasetRowId),
  )

  // TODO: This type conversion can be removed after dataset v2 migration
  const mappedInputs = mi as unknown as LinkedDatasetRow['mappedInputs']

  const onFetchPosition = useCallback(
    (data: WithPositionData) => {
      fetchedPosition.current = true
      setPosition(data)
    },
    [selectedDatasetRowId, document.datasetV2Id],
  )

  const { isLoading: isLoadingPosition } = useDatasetRowWithPosition({
    dataset: enabled && dataset ? dataset : undefined,
    enabled: !fetchedPosition.current,
    datasetRowId: selectedDatasetRowId,
    onFetched: onFetchPosition,
  })

  console.log('CURRENT_POSITION', position, selectedDatasetRowId)
  const { data: datasetRows, isLoading: isLoadingRow } = useDatasetRows({
    dataset: position && dataset ? (dataset as DatasetV2) : undefined,
    page: String(position?.position),
    pageSize: '1', // Paginatinate one by one in document parameters
    onFetched: async (data) => {
      const row = data[0]
      if (!row || !dataset) return

      await setDataset({
        datasetId: dataset.id,
        datasetVersion: DatasetVersion.V2,
        data: {
          datasetRowId: row.id,
        },
      })
      setSelectedDatasetRowId(row.id)
    },
  })
  const datasetRow = datasetRows?.[0]

  const updatePosition = useCallback(
    (position: number) => {
      if (isLoadingRow) return

      setPosition((prev) => {
        return prev ? { ...prev, position } : { position, page: 1 }
      })
    },
    [isLoadingRow],
  )

  const onNextPage = useCallback(
    (position: number) => updatePosition(position + 1),
    [updatePosition],
  )

  const onPrevPage = useCallback(
    (position: number) => updatePosition(position - 1),
    [updatePosition],
  )

  const onSelectRowCell = useCallback(
    (param: string) => (columnIdentifier: string) => {
      if (!dataset || !datasetRow) return

      const prevMapped = mappedInputs ?? {}
      const mapped = { ...prevMapped, [param]: columnIdentifier }
      setDataset({
        datasetId: dataset.id,
        datasetVersion: DatasetVersion.V2,
        data: {
          datasetRowId: datasetRow.id,
          mappedInputs: mapped,
        },
      })
    },
    [setDataset, mappedInputs, dataset?.id, datasetRow],
  )
  const parameters = useMemo<DatasetMappedValue[]>(() => {
    if (!metadata) return []

    const values = Array.from(metadata.parameters).map((param) => {
      const columnIdentifier = mappedInputs[param]
      const cells = datasetRow?.rowData ?? {}
      const rawValue = columnIdentifier ? cells[columnIdentifier] : undefined
      const value = objectToString(rawValue, rawValue?.toString())
      const isEmpty = value === ''
      return {
        param,
        value,
        isEmpty,
        columnIdentifier,
        isMapped: !!columnIdentifier,
      }
    })
    const mappedValues = values.reduce(
      (acc, { param, value }) => {
        acc[param] = value
        return acc
      },
      {} as Record<string, string>,
    )

    onParametersChange(mappedValues)

    return values
  }, [metadata, onParametersChange, mappedInputs, datasetRow])
  return {
    isLoading: isLoadingRow || isLoadingDatasetRowsCount || isLoadingPosition,
    mappedInputs: mappedInputs ?? {},
    parameters,
    rowCellOptions,
    onSelectRowCell,
    position: position?.position,
    count: count ?? 0,
    onNextPage,
    onPrevPage,
  }
}
