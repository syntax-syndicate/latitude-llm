import { sql, eq, and, getTableColumns, count, desc } from 'drizzle-orm'

import { DatasetRow, DEFAULT_PAGINATION_SIZE } from '../browser'
import { datasetRows } from '../schema'
import Repository from './repositoryV2'
import { calculateOffset } from '../lib/pagination/calculateOffset'
import { Result } from '../lib'

const tt = getTableColumns(datasetRows)

export class DatasetRowsRepository extends Repository<DatasetRow> {
  get scopeFilter() {
    return eq(datasetRows.workspaceId, this.workspaceId)
  }

  get scope() {
    return this.db
      .select(tt)
      .from(datasetRows)
      .where(this.scopeFilter)
      .$dynamic()
  }

  findByDatasetPaginated({
    datasetId,
    page = '1',
    pageSize = String(DEFAULT_PAGINATION_SIZE),
  }: {
    page?: string
    pageSize?: string
    datasetId: number
  }) {
    const offset = calculateOffset(page, pageSize)
    const limit = parseInt(pageSize)
    return this.findByDatasetWithOffsetAndLimit({ datasetId, offset, limit })
  }

  findByDatasetWithOffsetAndLimit({
    datasetId,
    offset,
    limit,
  }: {
    datasetId: number
    offset: number
    limit: number
  }) {
    return this.db
      .select(tt)
      .from(datasetRows)
      .where(and(this.scopeFilter, eq(datasetRows.datasetId, datasetId)))
      .limit(limit)
      .orderBy(desc(datasetRows.createdAt))
      .offset(offset)
  }

  async fetchDatasetRowWithPosition({
    datasetId,
    datasetRowId,
  }: {
    datasetId: number
    datasetRowId: number
  }) {
    const rows = await this.db
      .select(tt)
      .from(datasetRows)
      .where(
        and(
          this.scopeFilter,
          eq(datasetRows.datasetId, datasetId),
          eq(datasetRows.id, datasetRowId),
        ),
      )

    const row = rows[0]

    if (!row) {
      return Result.error(
        new Error(`Dataset row not found with id ${datasetRowId}`),
      )
    }

    const targetCreatedAtUTC = new Date(row.createdAt).toISOString()
    const countResult = await this.db
      .select({
        count: sql`count(*)`.mapWith(Number).as('total_count'),
      })
      .from(datasetRows)
      .where(
        and(
          this.scopeFilter,
          sql`${datasetRows.createdAt} >= ${targetCreatedAtUTC}`,
        ),
      )
    const position = Number(countResult[0]?.count)
    const page = Math.ceil(position / DEFAULT_PAGINATION_SIZE)

    return Result.ok({ position, page })
  }

  getCountByDataset(datasetId: number) {
    return this.db
      .select({
        count: count(datasetRows.id),
      })
      .from(datasetRows)
      .where(and(this.scopeFilter, eq(datasetRows.datasetId, datasetId)))
  }
}
