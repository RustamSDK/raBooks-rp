import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Shared server-side Gemini SDK client with required telemetry header
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Gemini Multi-Turn Chat & Copilot API Endpoints
 * Supports multi-turn conversation history, dynamic roles, system instructions,
 * and model selection (gemini-3.7-flash, gemini-3.1-pro-preview, gemini-3.5-flash, gemini-3.1-flash-lite).
 */
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      history = [],
      model = 'gemini-3.7-flash',
      role = 'controller',
      systemInstruction: customInstruction,
      context,
    } = req.body;

    if (!geminiApiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A valid message string is required.' });
    }

    // Role-specific baseline prompts
    const rolePrompts: Record<string, string> = {
      controller: `You are the Chief Financial Controller & Ledger Auditor for raBooks by Rustam.
Your objective is to ensure mathematical invariance, split reconciliation, audit compliance, and precise liquidity accounting.
Always communicate in 100% formal corporate English. Provide structured financial analysis, balance reconciliations, and actionable accounting advice.`,
      restructure: `You are the Senior Debt Restructuring & EMI Workout Strategist for raBooks by Rustam.
Your objective is to advise on loan restructuring, amortizations, delinquent debt recovery strategies, settlement negotiations, and risk mitigation.
Offer concrete financial installment plans, interest rate assessments (compounding vs flat), and structured settlement terms with integer precision.`,
      cashflow: `You are the Cash Flow Forecaster & Working Capital Analyst for raBooks by Rustam.
Your objective is to analyze receivables vs payables velocity, forecast liquidity runways, predict seasonal capital shortfalls, and optimize working capital.`,
      credit: `You are the Counterparty Credit & Risk Evaluator for raBooks by Rustam.
Your objective is to evaluate counterparty exposure, overdue risk ratings, trust scores, concentration limits, and creditworthiness across debtors and creditors.`,
      fast: `You are the Instant Bookkeeper & Rapid Arithmetic Assistant for raBooks by Rustam.
Your objective is to provide ultra-fast, concise, and direct answers to accounting queries, currency conversions (paise to INR), transaction lookups, and split checks. Keep responses brief, accurate, and immediately actionable.`,
      custom: customInstruction || `You are an executive financial assistant for raBooks by Rustam.`,
    };

    const baseRoleInstruction = rolePrompts[role] || rolePrompts.controller;

    // Build comprehensive system instruction with real-time ledger context
    const fullSystemInstruction = `${baseRoleInstruction}

### Enterprise Financial Context Grounding:
- Total Receivables (Paise): ${context?.totalReceivablesPaise || 0} (₹${((context?.totalReceivablesPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
- Total Payables (Paise): ${context?.totalPayablesPaise || 0} (₹${((context?.totalPayablesPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
- Net Liquidity (Paise): ${context?.netLiquidityPaise || 0} (₹${((context?.netLiquidityPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
- Active Counterparties (${(context?.parties || []).length}): ${JSON.stringify((context?.parties || []).slice(0, 15))}
- Active EMI / Debt Plans (${(context?.emiPlans || []).length}): ${JSON.stringify((context?.emiPlans || []).slice(0, 10))}
- Recent Ledger Transactions: ${JSON.stringify((context?.transactions || []).slice(0, 15))}

### Inviolable Governance Directives:
1. Integer Precision: Money is recorded internally in integer paise (1 Rupee = 100 paise). When displaying amounts to users, format them cleanly as ₹X,XX,XXX.XX.
2. Split Invariant: Split allocations must always sum to the total transaction amount.
3. Dual-ID Decoupling: External reference numbers (UTR, Cheque number) are never used as internal keys.
4. Corporate Standard: 100% formal corporate English across all communications.
5. Use markdown tables, bold headers, and bullet points for readability.`;

    // Format multi-turn conversation contents for @google/genai SDK
    // Structure: array of { role: 'user' | 'model', parts: [{ text: string }] }
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (item.text && item.text.trim()) {
          contents.push({
            role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    // Append the latest user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Validate and sanitize selected model
    const allowedModels = [
      'gemini-3.7-flash',
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-lite',
    ];
    const selectedModel = allowedModels.includes(model) ? model : 'gemini-3.7-flash';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
      },
    });

    const replyText = response.text || 'No response generated from the model.';

    return res.json({
      text: replyText,
      modelUsed: selectedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Gemini Multi-Turn Chat Error:', err);
    return res.status(500).json({
      error: err.message || 'An error occurred while communicating with Gemini.',
    });
  }
});

/**
 * Gemini Copilot API Endpoint
 * Handles Magic Entry structured extraction, Legacy Q&A, and Audit Risk Analysis
 */
app.post('/api/ai/copilot', async (req: Request, res: Response) => {
  try {
    const { mode, text, context } = req.body;

    if (!geminiApiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    if (mode === 'magic-entry') {
      const systemInstruction = `You are the raBooks Financial Core Parser.
Parse natural language financial narration into an exact structured JSON entry adhering to the Eight Inviolable Laws:
1. All currency values must be signed 64-bit integer paise (₹1.00 = 100 paise; e.g., ₹25,000 = 2500000 paise).
2. MovementType must be either "GIVEN" (capital disbursed/lent/paid out) or "TAKEN" (repayment collected/received/borrowed).
3. Payment splits must sum exactly to totalAmountPaise (Reconciliation Invariant: totalAmountPaise - sum(splits.amountPaise) = 0).
4. Extract external payment reference identifiers (UTR, cheque number, bank reference, cash voucher) into splits[].paymentReferenceId.
5. If no specific rail is specified, default to UPI or Bank as appropriate.
6. Match against known counterparties if provided in context: ${JSON.stringify(
        (context?.partyNames || []).slice(0, 10)
      )}.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: text,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              partyName: {
                type: Type.STRING,
                description: 'Legal counterparty name or entity',
              },
              movementType: {
                type: Type.STRING,
                description: 'GIVEN for disbursement/loan out, TAKEN for collection/loan in',
              },
              totalAmountPaise: {
                type: Type.INTEGER,
                description: 'Total transaction amount in integer paise',
              },
              notes: {
                type: Type.STRING,
                description: 'Commercial purpose narration',
              },
              splits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    method: {
                      type: Type.STRING,
                      description: 'Cash, UPI, Bank, or Cheque',
                    },
                    amountPaise: {
                      type: Type.INTEGER,
                      description: 'Allocated split amount in integer paise',
                    },
                    paymentReferenceId: {
                      type: Type.STRING,
                      description: 'External UTR, Cheque number, or Bank Voucher reference',
                    },
                  },
                  required: ['method', 'amountPaise'],
                },
              },
            },
            required: ['partyName', 'movementType', 'totalAmountPaise', 'splits'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');

      // Guarantee split balance invariant on server response
      if (parsed.splits && parsed.splits.length > 0 && parsed.totalAmountPaise) {
        let sumSplits = parsed.splits.reduce((acc: number, s: any) => acc + (s.amountPaise || 0), 0);
        const diff = parsed.totalAmountPaise - sumSplits;
        if (diff !== 0) {
          // Adjust last split row to ensure delta === 0
          parsed.splits[parsed.splits.length - 1].amountPaise += diff;
        }
      }

      return res.json({ result: parsed });
    } else if (mode === 'chat') {
      const systemInstruction = `You are the executive financial copilot for raBooks by Rustam.
Analyze the current institutional ledger telemetry, parties, running balances, and debt restructuring plans provided in context.
Answer questions directly with institutional authority, precise rupee amounts (converted from paise), and actionable recommendations.
Context:
- Total Receivables: ₹${((context?.totalReceivablesPaise || 0) / 100).toFixed(2)}
- Total Payables: ₹${((context?.totalPayablesPaise || 0) / 100).toFixed(2)}
- Net Liquidity: ₹${((context?.netLiquidityPaise || 0) / 100).toFixed(2)}
- Active Counterparties: ${JSON.stringify(context?.parties || [])}
- Active EMI Plans: ${JSON.stringify(context?.emiPlans || [])}
- Recent Transactions: ${JSON.stringify((context?.transactions || []).slice(0, 10))}

Rules:
- Adhere 100% to formal corporate English. Zero colloquialisms or Hinglish.
- Display currency with ₹ symbol and tabular precision.
- Provide concise, executive-grade answers.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: text,
        config: {
          systemInstruction,
        },
      });

      return res.json({ answer: response.text });
    } else if (mode === 'audit') {
      const systemInstruction = `You are the raBooks Chief Internal Auditor.
Review the provided transaction batch and identify potential non-compliance, missing UTR references, duplicate amounts, split imbalances, or concentration risks.
Provide a clean bulleted report with severity levels [LOW, MEDIUM, HIGH].
Context:
${JSON.stringify((context?.transactions || []).slice(0, 15))}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: text || 'Run complete audit inspection on recent ledger activity.',
        config: {
          systemInstruction,
        },
      });

      return res.json({ report: response.text });
    }

    return res.status(400).json({ error: 'Invalid mode specified.' });
  } catch (err: any) {
    console.error('Gemini Copilot Error:', err);
    return res.status(500).json({
      error: err.message || 'Internal error in Gemini Copilot proxy.',
    });
  }
});

/**
 * Server-Side RFC 4180 CSV Export Endpoint
 */
app.post('/api/export/csv', (req: Request, res: Response) => {
  try {
    const { transactions, parties } = req.body;

    const partyMap = new Map<string, string>();
    if (Array.isArray(parties)) {
      parties.forEach((p: any) => partyMap.set(p.id, p.name));
    }

    // RFC 4180 compliant CSV headers
    const headers = [
      'Transaction ID',
      'Date',
      'Counterparty',
      'Movement Type',
      'Total Amount (INR)',
      'Total Amount (Paise)',
      'Payment Rails & Splits',
      'External Reference IDs',
      'Status',
      'Narration',
    ];

    const escapeCsv = (str: string) => {
      const sanitized = (str || '').replace(/"/g, '""');
      return `"${sanitized}"`;
    };

    const rows: string[] = [headers.join(',')];

    if (Array.isArray(transactions)) {
      for (const t of transactions) {
        const partyName = partyMap.get(t.partyId) || t.partyId || 'Unknown';
        const inrAmount = (t.totalAmountPaise / 100).toFixed(2);
        const splitMethods = (t.splits || []).map((s: any) => `${s.method}: ₹${(s.amountPaise / 100).toFixed(2)}`).join('; ');
        const refIds = (t.splits || []).map((s: any) => s.paymentReferenceId || 'N/A').join('; ');

        rows.push([
          escapeCsv(t.id),
          escapeCsv(t.date),
          escapeCsv(partyName),
          escapeCsv(t.type),
          escapeCsv(inrAmount),
          t.totalAmountPaise,
          escapeCsv(splitMethods),
          escapeCsv(refIds),
          escapeCsv(t.status),
          escapeCsv(t.notes),
        ].join(','));
      }
    }

    const csvContent = rows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rabooks-ledger-statement.csv"');
    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});

// Setup Vite middlewares in development or serve static assets in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`raBooks Enterprise Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
