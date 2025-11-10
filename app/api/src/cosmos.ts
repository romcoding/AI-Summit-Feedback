import { CosmosClient, Container } from '@azure/cosmos'

const client = new CosmosClient({
  endpoint: process.env.COSMOS_URI!,
  key: process.env.COSMOS_KEY!,
})

export const database = client.database(process.env.COSMOS_DB || 'askai')
export const container: Container = database.container(process.env.COSMOS_CONTAINER || 'questions')

