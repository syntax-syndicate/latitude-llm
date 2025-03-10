import { eq } from 'drizzle-orm'

import {
  Dataset,
  DatasetV2,
  DatasetVersion,
  DocumentVersion,
  LinkedDataset,
  LinkedDatasetRow,
} from '../../browser'
import { database } from '../../client'
import { Result, Transaction, TypedResult } from '../../lib'
import { documentVersions } from '../../schema'

function getLinkedData({
  inputs,
  rowIndex,
  datasetRowId,
  mappedInputs,
  datasetVersion,
}: {
  datasetVersion: DatasetVersion
  rowIndex: number | undefined
  datasetRowId: number | undefined
  inputs?: LinkedDataset['inputs']
  mappedInputs: LinkedDataset['mappedInputs'] | LinkedDatasetRow['mappedInputs']
}) {
  if (datasetVersion === DatasetVersion.V1) {
    return { inputs, mappedInputs, rowIndex }
  }

  return { mappedInputs, datasetRowId: datasetRowId! }
}

type LinkedColumn<V extends DatasetVersion = DatasetVersion> =
  V extends DatasetVersion.V1
  ? Record<number, LinkedDataset>
  : Record<number, LinkedDatasetRow>
export async function saveLinkedDataset<V extends DatasetVersion>(
  {
    document,
    dataset,
    datasetVersion,
    data,
  }: {
    document: DocumentVersion
    datasetVersion: V
    dataset: V extends DatasetVersion.V1 ? Dataset : DatasetV2
    data: {
      rowIndex: number | undefined
      // FIXME: do manadatory when migrated to Dataset V2
      datasetRowId: number | undefined
      mappedInputs: LinkedDataset['mappedInputs'] | LinkedDatasetRow['mappedInputs']
      inputs?: LinkedDataset['inputs']
    }
  },
  trx = database,
): Promise<TypedResult<DocumentVersion, Error>> {
  const prevLinkedData = document.linkedDataset ?? {}
  datasetVersion === DatasetVersion.V1
    ? (document.linkedDataset ?? {})
    : datasetVersion === DatasetVersion.V2
      ? (document.linkedDatasetAndRow ?? {})
      : undefined

  // TODO: Remove this check after migrated to datasets V2
  if (prevLinkedData === undefined) {
    return Result.error(new Error('Invalid dataset version'))
  }

  const prevData = prevLinkedData as LinkedColumn<V>

  if (datasetVersion === DatasetVersion.V2 && data.datasetRowId === undefined) {
    return Result.error(new Error('Invalid dataset row id'))
  }

  return await Transaction.call(async (tx) => {
    const newLinkedData = {
      ...prevData,
      [dataset.id]: getLinkedData({
        datasetVersion,
        rowIndex: data.rowIndex,
        datasetRowId: data.datasetRowId,
        inputs: data.inputs,
        mappedInputs: data.mappedInputs,
      }),
    }

    let insertData: Partial<typeof documentVersions.$inferInsert>
    if (datasetVersion === DatasetVersion.V1) {
      insertData = {
        linkedDataset: newLinkedData as LinkedColumn<DatasetVersion.V1>,
      }
    } else if (datasetVersion === DatasetVersion.V2) {
      insertData = {
        linkedDatasetAndRow: newLinkedData as LinkedColumn<DatasetVersion.V2>,
      }
    } else {
      return Result.error(new Error('Invalid dataset version'))
    }

    const result = await tx
      .update(documentVersions)
      .set(insertData)
      .where(eq(documentVersions.id, document.id))
      .returning()

    return Result.ok(result[0]!)
  }, trx)
}
