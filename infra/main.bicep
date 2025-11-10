@description('Name of the resource group')
param resourceGroupName string = 'rg-askai-event'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Azure OpenAI model name')
param modelName string = 'gpt-4o'

@description('Static Web App name')
param staticWebAppName string = 'askai-${uniqueString(resourceGroup().id)}'

// Cosmos DB
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'askai-cosmos-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    databaseAccountOfferType: 'Standard'
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosAccount
  name: 'askai'
  properties: {
    resource: {
      id: 'askai'
    }
  }
}

resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'questions'
  properties: {
    resource: {
      id: 'questions'
      partitionKey: {
        paths: ['/sessionId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
  }
}

// SignalR Service
resource signalRService 'Microsoft.SignalRService/signalR@2023-02-01' = {
  name: 'askai-signalr-${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Free_F1'
    tier: 'Free'
  }
  kind: 'SignalR'
  properties: {
    features: [
      {
        flag: 'ServiceMode'
        value: 'Serverless'
      }
    ]
  }
}

// Azure OpenAI (assumes already exists, reference it)
@description('Azure OpenAI endpoint')
param openAIEndpoint string = ''

@description('Azure OpenAI key')
@secure()
param openAIKey string = ''

// Content Safety (assumes already exists)
@description('Content Safety endpoint')
param contentSafetyEndpoint string = ''

@description('Content Safety key')
@secure()
param contentSafetyKey string = ''

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'askai-insights-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: staticWebAppName
  location: location
  sku: {
    tier: 'Free'
    name: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
  }
}

// Outputs
output cosmosAccountName string = cosmosAccount.name
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output signalREndpoint string = signalRService.properties.hostName
output signalRConnectionString string = listKeys(signalRService.id, signalRService.apiVersion).primaryConnectionString
output appInsightsKey string = appInsights.properties.InstrumentationKey
output staticWebAppUrl string = staticWebApp.properties.defaultHostname

