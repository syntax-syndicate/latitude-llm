import { Workspace } from '../../browser'
import { LogSources, StreamType } from '../../constants'
import { ChainStepResponse } from '../../constants'
import { ValidatedStep } from './ChainValidator'
import { buildProviderLogDto } from './ProviderProcessor/saveProviderLog'
import { getCachedResponse, setCachedResponse } from '../commits/promptCache'
import { createProviderLog } from '../providerLogs/create'

export class CachedResponseHandler {
  constructor(
    private readonly workspace: Workspace,
    private readonly source: LogSources,
    private readonly errorableUuid: string,
  ) {}

  async tryGetCachedResponse(
    step: ValidatedStep,
    stepStartTime: number,
  ): Promise<ChainStepResponse<StreamType> | null> {
    const cachedResponse = await getCachedResponse({
      workspace: this.workspace,
      config: step.config,
      conversation: step.conversation,
    })

    if (!cachedResponse) return null

    const providerLog = await createProviderLog({
      workspace: this.workspace,
      finishReason: 'stop',
      ...buildProviderLogDto({
        workspace: this.workspace,
        source: this.source,
        provider: step.provider,
        conversation: step.conversation,
        stepStartTime,
        errorableUuid: this.errorableUuid,
        response: cachedResponse,
      }),
    }).then((r) => r.unwrap())

    return { ...cachedResponse, providerLog }
  }

  async cacheResponse(
    step: ValidatedStep,
    response: ChainStepResponse<StreamType>,
  ): Promise<void> {
    await setCachedResponse({
      workspace: this.workspace,
      config: step.config,
      conversation: step.conversation,
      response,
    })
  }
}
