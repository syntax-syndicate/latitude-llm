import { useCallback, useMemo, useState } from 'react'

import {
  Dataset,
  DocumentVersion,
  DatasetV2,
  InputSource,
  INPUT_SOURCE,
  DatasetVersion,
} from '@latitude-data/core/browser'
import { useCurrentCommit, useCurrentProject } from '@latitude-data/web-ui'
import useDocumentVersions from '$/stores/documentVersions'
import { useVersionedDatasets } from '$/hooks/useVersionedDatasets'
import { useDatasetV1RowsForParamaters } from './useDatasetRowsForParameters/useDatasetV1RowsForParamaters'

export function useSelectDataset({
  document,
  commitVersionUuid,
  source,
}: {
  document: DocumentVersion
  commitVersionUuid: string
  source: InputSource
}) {
  const [selectedDataset, setSelectedDataset] = useState<
    Dataset | DatasetV2 | undefined
  >()
  const { project } = useCurrentProject()
  const { commit } = useCurrentCommit()
  const { assignDataset } = useDocumentVersions()
  const isEnabled = source === INPUT_SOURCE.dataset
  const {
    data: datasets,
    isLoading: isLoadingDatasets,
    datasetVersion,
  } = useVersionedDatasets({
    enabled: isEnabled,
    onFetched: (data, datasetVersion) => {
      const isV1 = datasetVersion === DatasetVersion.V1
      const documentAttr = isV1 ? 'datasetId' : 'datasetV2Id'
      setSelectedDataset(data.find((ds) => ds.id === document[documentAttr]))
    },
  })
  const datasetOptions = useMemo(
    () => datasets.map((ds) => ({ value: ds.id, label: ds.name })),
    [datasets, isEnabled],
  )
  const onSelectDataset = useCallback(
    async (value: number) => {
      const ds = datasets.find((ds) => ds.id === Number(value))
      if (!ds) return

      await assignDataset({
        projectId: project.id,
        documentUuid: document.documentUuid,
        commitUuid: commit.uuid,
        datasetId: ds.id,
        datasetVersion,
      })

      setSelectedDataset(ds)
    },
    [
      datasets,
      datasetVersion,
      assignDataset,
      project.id,
      document.documentUuid,
      commit.uuid,
    ],
  )

  const isV1 = datasetVersion === DatasetVersion.V1
  const rowsV1 = useDatasetV1RowsForParamaters({
    document,
    commitVersionUuid,
    dataset: isV1 ? (selectedDataset as Dataset) : undefined,
    enabled: isEnabled,
  })

  const rowsData = isV1
    ? rowsV1
    : {
        // FIXME: Implement V2
        isLoading: false,
        mappedInputs: {},
        rowCellOptions: [],
        onSelectRowCell: (_p: string) => (_v: number) => {},
        count: 0,
        position: 0,
        onPrevPage: () => {},
        onNextPage: () => {},
      }

  return {
    // Rows data
    ...rowsData,
    // Dataset selection
    datasetOptions,
    selectedDataset,
    onSelectDataset,
    isLoading: isLoadingDatasets || rowsData.isLoading,
  }
}

export type UseSelectDataset = ReturnType<typeof useSelectDataset>
