import type { IntegrationDto } from '@latitude-data/core/browser'
import useFetcher from '$/hooks/useFetcher'
import { ROUTES } from '$/services/routes'
import useSWR, { SWRConfiguration } from 'swr'
import { McpTool } from '@latitude-data/constants'

const EMPTY_ARRAY: McpTool[] = []

type ToolResponse =
  | { data: McpTool[]; ok: true }
  | { errorMessage: string; ok: false }

export default function useIntegrationTools(
  integration?: IntegrationDto,
  opts?: SWRConfiguration,
) {
  const fetcher = useFetcher<McpTool[], ToolResponse>(
    integration
      ? ROUTES.api.integrations.detail(integration.name).listTools.root
      : undefined,
    {
      serializer: (response) => {
        if (!response.ok) {
          throw new Error(response.errorMessage)
        }
        return response.data
      },
    },
  )
  const {
    data = EMPTY_ARRAY,
    isLoading,
    isValidating,
    error,
  } = useSWR<McpTool[]>(['integrationTools', integration?.name], fetcher, opts)

  return {
    data,
    isLoading,
    isValidating,
    error,
  }
}
