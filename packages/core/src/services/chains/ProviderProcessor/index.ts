import { objectToString, StreamType } from '../../../browser'
import { AIReturn } from '../../ai'
import {
  CoreAssistantMessage,
  CoreToolMessage,
  LanguageModelResponseMetadata,
} from 'ai'

export async function buildChainStepResponse({
  aiResult,
  errorableUuid,
}: {
  aiResult: Awaited<AIReturn<StreamType>>
  errorableUuid?: string
}) {
  if (aiResult.type === 'text') {
    return buildStepTextResponse({ aiResult, errorableUuid })
  }

  return buildObjectStepResponse({ aiResult, errorableUuid })
}

async function buildStepTextResponse({
  aiResult,
  errorableUuid,
}: {
  aiResult: Awaited<AIReturn<'text'>>
  errorableUuid?: string
}) {
  const response = (await aiResult.data
    .response) as LanguageModelResponseMetadata & {
    messages: (CoreAssistantMessage | CoreToolMessage)[]
  }

  return {
    streamType: aiResult.type,
    documentLogUuid: errorableUuid,
    text: await aiResult.data.text,
    usage: await aiResult.data.usage,
    output: 'messages' in response ? response.messages : [],
    toolCalls: (await aiResult.data.toolCalls).map((t) => ({
      id: t.toolCallId,
      name: t.toolName,
      arguments: t.args,
    })),
  }
}

async function buildObjectStepResponse({
  aiResult,
  errorableUuid,
}: {
  errorableUuid?: string
  aiResult: Awaited<AIReturn<'object'>>
}) {
  const object = await aiResult.data.object
  return {
    streamType: aiResult.type,
    documentLogUuid: errorableUuid,
    usage: await aiResult.data.usage,
    text: objectToString(object),
    object,
  }
}
