import type { ContentType, Message } from '@latitude-data/compiler'

import { Providers } from '../models'
import { AppliedRules } from './index'
import {
  extractContentMetadata,
  extractMessageMetadata,
  getProviderMetadataKey,
  type ProviderMetadata,
} from './providerMetadata'

function groupContentMetadata({
  content,
  provider,
  messageMetadata,
}: {
  content: Message['content']
  provider: Providers
  messageMetadata?: ProviderMetadata
}) {
  const key = getProviderMetadataKey(provider)

  if (typeof content === 'string') {
    const baseMsg = { type: 'text' as ContentType, text: content }
    if (!messageMetadata) return [baseMsg]

    return [
      {
        ...baseMsg,
        experimental_providerMetadata: messageMetadata,
      },
    ]
  }

  return content.map((contentItem) => {
    const extracted = extractContentMetadata({ content: contentItem, provider })
    if (!messageMetadata) return extracted

    // @ts-expect-error - metadata key can be not present
    const contentMetadata = (extracted.experimental_providerMetadata ??
      {}) as ProviderMetadata

    return {
      ...extracted,
      experimental_providerMetadata: {
        [key]: {
          ...(messageMetadata?.[key] || {}),
          ...(contentMetadata?.[key] || {}),
        },
      },
    }
  })
}

export function vercelSdkRules(
  rules: AppliedRules,
  provider: Providers,
): AppliedRules {
  const messages = rules.messages.flatMap((message) => {
    const msg = extractMessageMetadata({
      message,
      provider,
    })

    const content = groupContentMetadata({
      content: msg.content,
      provider,
      messageMetadata: msg.experimental_providerMetadata,
    }) as unknown as Message['content']

    return [{ ...msg, content } as Message]
  }) as Message[]

  return { ...rules, messages }
}
