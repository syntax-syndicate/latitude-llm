import useDatasetRows from '$/stores/datasetRows'
import { useCallback, useMemo, useState } from 'react'
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

  const selectedDatasetRowId =
    document.linkedDatasetAndRow?.[document.datasetV2Id!]?.datasetRowId
  const [position, setPosition] = useState<WithPositionData | undefined>(
    selectedDatasetRowId ? undefined : { position: 1, page: 1 },
  )

  const {
    dataset: { inputs, mappedInputs: mi, setDatasetV2 },
  } = useDocumentParameters({
    document,
    commitVersionUuid,
    datasetVersion: DatasetVersion.V2,
  })
  // TODO: This type conversion can be removed after dataset v2 migration
  const mappedInputs = mi as LinkedDatasetRow['mappedInputs']

  const onFetchPosition = useCallback(
    (data: WithPositionData) => {
      setPosition(data)
    },
    [selectedDatasetRowId],
  )

  const { isLoading: isLoadingPosition } = useDatasetRowWithPosition({
    dataset: enabled ? (dataset as DatasetV2) : undefined,
    datasetRowId: selectedDatasetRowId,
    onFetched: onFetchPosition,
  })

  const { data: datasetRows, isLoading: isLoadingRow } = useDatasetRows({
    dataset:
      position === undefined
        ? undefined
        : enabled
          ? (dataset as DatasetV2)
          : undefined,
    page: position === undefined ? undefined : String(position.position),
    pageSize: '1', // Paginatinate one by one in document parameters
  })
  const datasetRow = datasetRows?.[0]

  const updatePosition = useCallback(
    (position: number) => {
      if (isLoadingRow) return

      setPosition((prev) =>
        prev ? { ...prev, position } : { position, page: 1 },
      )
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
      setDatasetV2({
        datasetId: dataset.id,
        datasetVersion: DatasetVersion.V2,
        data: {
          datasetRowId: datasetRow.id,
          mappedInputs: mapped,
        },
      })
    },
    [inputs, setDatasetV2, mappedInputs, dataset?.id, datasetRow],
  )

  console.log('META.paramaters', metadata?.parameters)
  console.log('META.config.paramaters', metadata?.config?.parameters)
  console.log('ROWS_DATA', { datasetRow, position, count })
  console.log('ROW_CELL_OPTIONS', rowCellOptions)
  return {
    isLoading: isLoadingRow || isLoadingDatasetRowsCount || isLoadingPosition,
    mappedInputs: mappedInputs ?? {},
    rowCellOptions,
    onSelectRowCell,
    position: position?.position,
    count: count ?? 0,
    onNextPage,
    onPrevPage,
  }
}
