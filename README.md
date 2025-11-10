# AI Summit Feedback - Real-time Q&A Microsite

A custom microsite for real-time AI-powered Q&A at events, built with Azure services.

## Architecture

- **Frontend**: Next.js (Static Web Apps)
- **Backend**: Azure Functions
- **Database**: Azure Cosmos DB
- **Real-time**: Azure SignalR Service
- **AI**: Azure OpenAI (GPT-4o)
- **Monitoring**: Azure Application Insights

## Quick Start

### Prerequisites

- Node.js 18+
- Azure CLI
- Azure subscription with:
  - Azure OpenAI
  - Cosmos DB
  - SignalR Service
  - Static Web Apps

### Setup

1. Clone and install dependencies:
```bash
npm install
cd app/frontend && npm install
cd ../api && npm install
```

2. Configure environment variables (see `.env.example`)

3. Deploy infrastructure:
```bash
cd infra
az deployment group create --resource-group rg-askai-event --template-file main.bicep
```

4. Deploy frontend and API:
```bash
# Deploy Static Web App (includes Functions)
az staticwebapp deploy ...
```

## Project Structure

- `/app/frontend` - Next.js app with `/ask` and `/wall` pages
- `/app/api` - Azure Functions for questions, answers, and real-time updates
- `/infra` - Bicep templates for Azure resources

## Event Day Setup

1. Print QR code pointing to `/ask?session=YOUR-SESSION-ID`
2. Open `/wall?session=YOUR-SESSION-ID` on projector device
3. Enable admin mode: `/wall?session=YOUR-SESSION-ID&admin=true`

## License

MIT

