# Infrastructure Deployment

## Prerequisites

- Azure CLI installed
- Azure subscription with permissions to create resources
- Azure OpenAI resource already created (or update the Bicep to create it)

## Deploy

```bash
# Login
az login

# Create resource group
az group create --name rg-askai-event --location switzerlandnorth

# Deploy
az deployment group create \
  --resource-group rg-askai-event \
  --template-file main.bicep \
  --parameters \
    openAIEndpoint="https://your-openai.openai.azure.com/" \
    openAIKey="your-key" \
    contentSafetyEndpoint="https://your-content-safety.cognitiveservices.azure.com/" \
    contentSafetyKey="your-key"
```

## Get Outputs

```bash
az deployment group show \
  --resource-group rg-askai-event \
  --name main \
  --query properties.outputs
```

