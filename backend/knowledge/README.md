# POLAR-EMS Retrieval-Augmented Generation (RAG) Knowledge Subsystem

## 1. What is RAG in POLAR-EMS?
Retrieval-Augmented Generation (RAG) is the foundational knowledge grounding layer for the POLAR-EMS AI assistant. It provides deterministic, semantically indexed access to polar microgrid architecture specifications, thermodynamic/aerodynamic equations, hardware constraints, operational guidelines, and resilience scenario parameters.

> [!IMPORTANT]
> **CRITICAL SCIENTIFIC DISTINCTION**:
> **RAG knowledge retrieval is not the same as live telemetry retrieval.**
> 
> The RAG subsystem retrieves engineering documentation, physical mathematical models, hardware specifications, and baseline scenario parameters. The future AI assistant will require separate, dedicated database tools for real-time SCADA values such as:
> - Current battery State of Charge (SOC)
> - Real-time electrical demand load
> - Live renewable solar & wind generation
> - Active generator dispatch output and fuel levels
> - Current AWS meteorological observations
> - 24-hour lookahead ML temperature forecasts
> - Real-time Google OR-Tools MILP optimization results

---

## 2. Directory Structure and Knowledge Domains

```text
backend/knowledge/
├── system/
│   ├── polar-ems-overview.md       # High-level architecture, objectives, and polar operational goals
│   └── data-architecture.md        # PostgreSQL schema, Neon pgvector, relational vs time-series tables
├── stations/
│   ├── maitri.md                   # Maitri station (70.76° S), hardware ratings, 42.5 kW critical load
│   └── bharati.md                  # Bharati station (69.40° S), modern coastal promontory specifications
├── energy/
│   └── load-model.md               # Sub-zero thermal load model (1.8 kW/°C), occupancy, load shedding
├── renewable/
│   ├── solar-model.md              # IEC-61724-1 PV yield equations, midnight sun vs polar night dynamics
│   └── wind-model.md               # Piecewise cubic aerodynamic turbine curve (3.5 to 25 m/s cutout)
├── battery/
│   └── bess-model.md               # 350 kWh BESS, 20% min reserve, 95% max SOC, 80 kW charge/discharge
├── generators/
│   └── generator-model.md          # Multi-genset fleet (100 kW G1, 80 kW G2), fuel curves, CO2 intensity
├── optimization/
│   └── milp-dispatch.md            # Google OR-Tools 24h MILP unit commitment & economic dispatch
├── resilience/
│   └── scenarios.md                # 6 registered contingency scenarios (Polar Night, Blizzard, N-1 Trip)
├── forecasting/
│   └── weather-forecast.md         # HistGradientBoostingRegressor (R² = 0.9863, MAE = 0.3735°C)
├── provenance/
│   └── data-provenance.md          # Scientific integrity, 5 standard provenance classifications
└── evaluation/
    └── rag_questions.json          # 12 benchmark evaluation questions covering all subsystems
```

---

## 3. Data Provenance Classifications
Every knowledge document and chunk in POLAR-EMS is stamped with strict provenance metadata:
- **`REAL / MEASURED`**: Continuous empirical observations recorded by physical station sensors and SCADA telemetry (e.g. 8,760 hourly Maitri 2019 AWS weather observations).
- **`REAL CLIMATOLOGY`**: Long-term monthly-hourly averaged historical observations (e.g. 1985–2000 IMD solar radiation archives).
- **`MODELED / SCENARIO`**: Mathematically generated time-series based on deterministic physics, IEC formulas, or OR-Tools optimization schedules (e.g. `solar_generation_history`, resilience scenarios).
- **`ENGINEERING ASSUMPTION`**: Hardware ratings, thermal loss coefficients, fuel consumption slopes, and operational constraints calibrated from polar engineering literature.
- **`UNAVAILABLE`**: Periods or parameters where sensor data is missing or physical conditions prevent observation (e.g. solar radiation during June polar night).

---

## 4. Chunking Engine
The Markdown-aware chunker ([`backend/src/services/rag/chunker.js`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/backend/src/services/rag/chunker.js)):
- Parses YAML frontmatter metadata (`documentId`, `title`, `category`, `station`, `provenance`, `source`, `version`).
- Splits documents across Markdown section headers (`#`, `##`, `###`) while preserving paragraph integrity.
- Keeps mathematical formulas and parameter explanations in the same chunk.
- Generates deterministic chunk IDs: `${documentId}_chunk_${chunkIndex}`.

---

## 5. Embeddings and Vector Database

### Vector Storage (`pgvector`)
Chunks are stored in PostgreSQL on Neon in the `rag_knowledge_chunks` table:
```sql
CREATE TABLE rag_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(100) NOT NULL,
    chunk_id VARCHAR(150) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    heading VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    station VARCHAR(50),
    provenance VARCHAR(100) NOT NULL,
    source VARCHAR(255),
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Embedding Providers
The embedding abstraction layer ([`backend/src/services/rag/embeddingProvider.js`](file:///c:/Users/Asus/.cache/tooling/Coding/SIH61/backend/src/services/rag/embeddingProvider.js)) supports:
1. **Google Gemini (`text-embedding-004`)**: 768 dimensions (activated when `GEMINI_API_KEY` is configured).
2. **OpenAI (`text-embedding-3-small`)**: 768 dimensions (activated when `OPENAI_API_KEY` is configured).
3. **Local Deterministic Vectorizer**: 768-dimensional normalized unit vector generator using domain term TF-IDF boosting, sub-word character 3-grams, and Murmur hash projections for 100% offline testing with zero external API dependencies.

---

## 6. How to Run Ingestion and Evaluation

### Ingesting Knowledge Base
To parse all Markdown knowledge documents, generate 768-dimensional embeddings, and upsert them into Neon PostgreSQL:
```bash
npm run knowledge:ingest
```

### Evaluating Semantic Retrieval
To run the automated benchmark evaluation across all 12 test questions:
```bash
npm run knowledge:eval
```

---

## 7. Retrieval API Endpoint

### Endpoint: `POST /api/rag/search` or `GET /api/rag/search`

#### Request (JSON):
```json
{
  "query": "What happens during the Polar Night scenario?",
  "station": "MAITRI",
  "category": "RESILIENCE",
  "topK": 3
}
```

#### Response (JSON):
```json
{
  "success": true,
  "query": "What happens during the Polar Night scenario?",
  "totalMatches": 3,
  "provider": "local-deterministic-768",
  "filters": {
    "station": "MAITRI",
    "category": "RESILIENCE",
    "provenance": "ALL"
  },
  "results": [
    {
      "chunkId": "resilience-scenarios_chunk_02",
      "documentId": "resilience-scenarios",
      "title": "Resilience Contingency Scenarios and What-If Analysis",
      "heading": "2. Active Registered Resilience Scenarios",
      "category": "RESILIENCE",
      "station": "ALL",
      "provenance": "MODELED / SCENARIO",
      "source": "ml-service/app/simulation/scenarios.py",
      "content": "### 2. Active Registered Resilience Scenarios\n1. **Polar Night (`polar-night`)**: Simulates mid-winter polar night conditions where solar irradiance is 0.0 W/m² and PV power is 0.0 kW...",
      "score": 0.3888
    }
  ]
}
```

---

## 8. Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL Neon connection pool URL | `postgresql://...` |
| `EMBEDDING_PROVIDER` | Preferred provider (`gemini`, `openai`, `local`) | `local` |
| `GEMINI_API_KEY` | Google Gemini API Key for `text-embedding-004` | *(Optional)* |
| `OPENAI_API_KEY` | OpenAI API Key for `text-embedding-3-small` | *(Optional)* |
| `PORT` | Express backend port | `8000` |
