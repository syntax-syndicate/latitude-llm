import useDatasetRows, { ClientDatasetRow } from '$/stores/datasetRows'
import { useCallback, useMemo, useState } from 'react'
import useDatasetRowsCount from '$/stores/datasetRowsCount'
import {
  type Inputs,
  DatasetV2,
  DatasetVersion,
  DocumentVersion,
} from '@latitude-data/core/browser'
import {
  useDatasetRowWithPosition,
  type WithPositionData,
} from './useDatasetRowsWithPosition'
import { buildColumnList } from '$/hooks/useVersionedDatasets'
import { useDocumentParameters } from '$/hooks/useDocumentParameters'
import { SelectOption } from '@latitude-data/web-ui'
import { ConversationMetadata } from 'promptl-ai'

function mappedToInputs({
  inputs,
  mappedInputs,
  datasetRow,
}: {
  inputs: Inputs<'dataset'>
  mappedInputs: Record<string, number>
  datasetRow: ClientDatasetRow | undefined
}) {
  const cells = datasetRow?.cells ?? []
  const mapped = Object.entries(mappedInputs).reduce((acc, [key, value]) => {
    const cell = cells[value] ?? ''
    acc[key] = {
      value: String(cell),
      metadata: {
        includeInPrompt: true,
      },
    }
    return acc
  }, {} as Inputs<'dataset'>)

  // Recalculate inputs
  return Object.entries(inputs).reduce((acc, [key, value]) => {
    const newInput = mapped[key]
    acc[key] = newInput ?? value // If not found let existing
    return acc
  }, {} as Inputs<'dataset'>)
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
    dataset: { inputs, mappedInputs, setDataset },
  } = useDocumentParameters({
    document,
    commitVersionUuid,
    datasetVersion: DatasetVersion.V2,
  })

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
    onFetched: (rows) => {
      const row = rows[0]
      if (!row) return

      console.log('ON_ROW_FETCHED', row)

      // Check history hook
      // Map dataset row to parameter inputs. This is only V2
      // set Selected datasetRow id
    },
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
    (param: string) => (headerIndex: number) => {
      console.log('SELECTED_CELL', param, headerIndex, dataset, datasetRow)

      if (!dataset || !datasetRow) return

      const prevMapped = mappedInputs ?? {}
      const mapped = { ...prevMapped, [param]: Number(headerIndex) }
      const newInputs = mappedToInputs({
        inputs,
        datasetRow,
        mappedInputs: mapped,
      })
      setDataset({
        datasetId: dataset.id,
        datasetVersion: DatasetVersion.V2,
        data: {
          inputs: newInputs,
          datasetRowId: datasetRow.id,
          mappedInputs: mapped,
        },
      })
    },
    [inputs, setDataset, mappedInputs, dataset?.id, datasetRow],
  )

  console.log('META.paramaters', metadata?.parameters)
  console.log('META.config.paramaters', metadata?.config?.parameters)
  console.log('ROWS_DATA', { datasetRow, position, count })
  console.log("ROW_CELL_OPTIONS", rowCellOptions)
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
