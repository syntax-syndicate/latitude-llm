import { useDocumentParameters } from '$/hooks/useDocumentParameters'
import {
  Dataset,
  LinkedDataset,
  DocumentVersion,
  PlaygroundInput,
  DatasetV2,
  DatasetVersion,
  LinkedDatasetRow,
} from '@latitude-data/core/browser'
import {
  ClientOnly,
  SelectOption,
  Text,
  type ICommitContextType,
} from '@latitude-data/web-ui'

import { InputsMapperItem, OnSelectRowCellFn } from './InputsMapperItem'
import { useCallback } from 'react'
import { objectToString } from '@latitude-data/constants'

function getTooltipValue(input: unknown) {
  if (input === undefined || input === null) {
    return { isEmpty: true, value: 'No value found' }
  }

  const isEmpty = input === ''
  return {
    isEmpty,
    value: isEmpty ? 'Empty value' : objectToString(input, input?.toString()),
  }
}

export function InputMapper({
  document,
  commit,
  parameters,
  mappedInputs,
  rowCellOptions,
  isLoading,
  onSelectRowCell,
  selectedDataset,
  datasetVersion,
}: {
  document: DocumentVersion
  commit: ICommitContextType['commit']
  parameters: string[]
  mappedInputs: LinkedDatasetRow['mappedInputs']
  rowCellOptions: SelectOption<string>[]
  onSelectRowCell: OnSelectRowCellFn<string>
  isLoading: boolean
  selectedDataset: Dataset | DatasetV2 | undefined
  datasetVersion: DatasetVersion
}) {
  const { setSource } = useDocumentParameters({
    document,
    commitVersionUuid: commit.uuid,
    datasetVersion,
  })
  const copyToManual = useCallback(() => { }, [])
  return (
    <ClientOnly>
      <div className='flex flex-col gap-3'>
        {parameters.length > 0 ? (
          <div className='grid grid-cols-[auto_1fr] gap-y-3'>
            {parameters.map((param, idx) => {
              const value = mappedInputs[param]
              const inputTooltipValue = getTooltipValue(value)
              const isMapped = value !== undefined
              const disabled = isLoading || !selectedDataset
              return (
                <InputsMapperItem
                  key={idx}
                  value={value as unknown as string}
                  isLoading={isLoading}
                  datasetVersion={DatasetVersion.V2}
                  disabled={disabled}
                  isMapped={isMapped}
                  param={param}
                  onSelectRowCell={onSelectRowCell}
                  rowCellOptions={rowCellOptions as SelectOption<string>[]}
                  setSource={setSource}
                  tooltipValue={inputTooltipValue}
                  copyToManual={copyToManual}
                />
              )
            })}
          </div>
        ) : (
          <Text.H6 color='foregroundMuted'>
            No inputs. Use &#123;&#123;input_name&#125;&#125; to insert.
          </Text.H6>
        )}
      </div>
    </ClientOnly>
  )
}
