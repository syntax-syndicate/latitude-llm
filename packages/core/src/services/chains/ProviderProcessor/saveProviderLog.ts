import { Conversation } from '@latitude-data/compiler'

import { ProviderApiKey, Workspace } from '../../../browser'
import { ChainStepResponse, LogSources, StreamType } from '../../../constants'
import { generateUUIDIdentifier } from '../../../lib'
import { PartialConfig } from '../../ai'

export function buildProviderLogDto({
  workspace,
  source,
  provider,
  conversation,
  stepStartTime,
  errorableUuid,
  response,
}: {
  workspace: Workspace
  source: LogSources
  provider: ProviderApiKey
  conversation: Conversation
  stepStartTime: number
  errorableUuid?: string
  response: ChainStepResponse<StreamType>
}) {
  return {
    uuid: generateUUIDIdentifier(),

    // AI Provider Data
    workspaceId: workspace.id,
    source: source,
    providerId: provider.id,
    providerType: provider.provider,
    documentLogUuid: errorableUuid,

    // AI
    duration: Date.now() - stepStartTime,
    generatedAt: new Date(),
    model: conversation.config.model as string,
    config: conversation.config as PartialConfig,
    messages: conversation.messages,
    output: response.streamType === 'text' ? response.output : undefined,
    usage: response.usage,
    responseObject:
      response.streamType === 'object' ? response.object : undefined,
    responseText: response.streamType === 'text' ? response.text : undefined,
    toolCalls: response.streamType === 'text' ? response.toolCalls : [],
  }
}
