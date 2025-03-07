import { ROUTES } from '$/services/routes'
import { DatasetVersion, DocumentVersion } from '@latitude-data/core/browser'
import {
  Button,
  cn,
  Select,
  type ICommitContextType,
} from '@latitude-data/web-ui'
import Link from 'next/link'

import { ParametersPaginationNav } from '../PaginationNav'
import { InputMapper } from './InputsMapper'
import { type UseSelectDataset } from './useSelectDataset'

function BlankSlate() {
  return (
    <Link
      href={ROUTES.datasets.root}
      className='flex flex-row items-center gap-1'
    >
      <Button iconProps={{ name: 'externalLink' }} variant='link'>
        Manage datasets
      </Button>
    </Link>
  )
}

export function DatasetParams({
  data,
  commit,
  document,
  datasetVersion,
}: {
  document: DocumentVersion
  commit: ICommitContextType['commit']
  data: UseSelectDataset
  datasetVersion: DatasetVersion
}) {
  const selectedId = data.selectedDataset?.id
  return (
    <div className='flex flex-col gap-y-4'>
      <div className='flex flex-row items-center justify-between gap-x-4 border-b border-border pb-4'>
        <Select
          name='datasetId'
          placeholder={data.isLoading ? 'Loading...' : 'Select dataset'}
          disabled={data.isLoading || !data.datasetOptions.length}
          options={data.datasetOptions}
          onChange={data.onSelectDataset}
          value={selectedId}
        />
        <div className='flex-none'>
          {data.selectedDataset && data.position !== undefined ? (
            <ParametersPaginationNav
              zeroIndex
              currentIndex={data.position}
              totalCount={data.count}
              onPrevPage={data.onPrevPage}
              onNextPage={data.onNextPage}
              label='rows in dataset'
            />
          ) : (
            <BlankSlate />
          )}
        </div>
      </div>
      <div className={cn({ 'opacity-50': data.isLoading })}>
        <InputMapper
          key={selectedId}
          document={document}
          commit={commit}
          isLoading={data.isLoading}
          mappedInputs={data.mappedInputs}
          rowCellOptions={data.rowCellOptions}
          onSelectRowCell={data.onSelectRowCell}
          selectedDataset={data.selectedDataset}
          datasetVersion={datasetVersion}
        />
      </div>
    </div>
  )
}
