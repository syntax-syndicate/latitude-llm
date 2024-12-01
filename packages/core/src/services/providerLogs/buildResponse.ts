import { ProviderLog } from '../../browser'

import { CoreAssistantMessage, CoreToolMessage } from 'ai'

export function buildProviderLogResponse(providerLog: ProviderLog) {
  return (providerLog.output ||
    providerLog.responseText ||
    (providerLog.responseObject ? providerLog.responseObject : null)) as
    | string
    | (CoreAssistantMessage | CoreToolMessage)[]
    | null
}
