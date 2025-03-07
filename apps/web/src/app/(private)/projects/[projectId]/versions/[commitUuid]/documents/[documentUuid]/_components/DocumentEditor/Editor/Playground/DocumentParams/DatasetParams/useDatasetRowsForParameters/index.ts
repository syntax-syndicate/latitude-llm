import useDatasetRows from '$/stores/datasetRows'
import { useCallback, useMemo, useState } from 'react'
import useDatasetRowsCount from '$/stores/datasetRowsCount'
import { DatasetV2 } from '@latitude-data/core/browser'
import {
  useDatasetRowWithPosition,
  type WithPositionData,
} from './useDatasetRowsWithPosition'
import { buildColumnList } from '$/hooks/useVersionedDatasets'

/**
 * This hook is responsible of fetching the dataset rows and the
 * total amount of dataset rows for a dataset (v2).
 * This way we can paginate in document parameters all the rows
 */
export function useDatasetRowsForParameters({
  dataset,
  enabled = true,
  selectedDatasetRowId,
}: {
  dataset: DatasetV2 | null | undefined
  enabled?: boolean
  selectedDatasetRowId?: string
}) {
  const headers = useMemo(() => buildColumnList(dataset), [dataset])
  const { data: count, isLoading: isLoadingDatasetRowsCount } =
    useDatasetRowsCount({
      dataset: enabled ? (dataset as DatasetV2) : undefined,
    })

  const [position, setPosition] = useState<WithPositionData | undefined>(
    selectedDatasetRowId ? undefined : { position: 1, page: 1 },
  )

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

  const { isLoading: isLoadingRow } = useDatasetRows({
    dataset:
      position === undefined
        ? undefined
        : enabled
          ? (dataset as DatasetV2)
          : undefined,
    page: position === undefined ? undefined : String(position.position),
    pageSize: '1', // Paginatinate one by one in document parameters
    onFetched: (rows) => {
      const row = rows[0]
      if (!row) return

      // Check history hook
      // Map dataset row to parameter inputs. This is only V2
      // set Selected datasetRow id
    },
  })

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

  return {
    isLoading: isLoadingRow || isLoadingDatasetRowsCount || isLoadingPosition,
    headers,
    position,
    count: count ?? 0,
    onNextPage,
    onPrevPage,
  }
}
