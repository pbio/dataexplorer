import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, csvData, password, conversationHistory, selectedColumns, maxRows } = await request.json();

    // Verify password
    const validPassword = process.env.DEMO_PASSWORD;
    if (!validPassword || password !== validPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build system prompt with cache control
    const systemPrompt: Anthropic.Messages.MessageCreateParams['system'] = [
      {
        type: 'text',
        text: `You are a data analysis assistant that can create interactive visualizations using Vega-Lite JSON specifications.

IMPORTANT: When the user first uploads CSV data, you will receive ONLY the column headers. Your job is to:
1. Understand what the user wants to do based on their request
2. Identify which columns are needed for that specific task
3. Respond with ONLY a JSON array of the column names needed, in this exact format:
\`\`\`json
["column1", "column2", "column3"]
\`\`\`

After column selection, you will receive the actual data for those columns and can then:
1. Analyze the data structure and content
2. Provide insights or answer their questions
3. Create appropriate visualizations using Vega-Lite
4. When iterating on visualizations, you can reference previous charts and modify them

When creating charts or visualizations, respond with a JSON code block containing a valid Vega-Lite specification:
\`\`\`json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart",
  "data": {
    "values": [
      {"category": "A", "value": 28},
      {"category": "B", "value": 55}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "category", "type": "nominal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
\`\`\`

Always include the $schema field and provide valid Vega-Lite v5 specifications. You can use marks like: bar, line, point, area, circle, square, and more.`,
        cache_control: { type: 'ephemeral' }
      }
    ];

    // Build messages array with conversation history
    const messages: Anthropic.Messages.MessageCreateParams['messages'] = [];

    // Handle CSV data
    if (csvData && csvData.length > 0) {
      const allColumns = Object.keys(csvData[0] || {});

      // Step 1: If no columns selected yet, send only headers for column selection
      if (!selectedColumns || selectedColumns.length === 0) {
        const headersContext = `I've uploaded a CSV file with ${csvData.length} rows.

Available columns: ${allColumns.join(', ')}

Please analyze my request and respond with ONLY a JSON array of the column names you need to fulfill my request. Use this exact format:
\`\`\`json
["column1", "column2"]
\`\`\`

Do not include any other text or explanation.`;

        messages.push({
          role: 'user',
          content: headersContext
        });
      }
      // Step 2: If columns are selected, send the filtered data
      else {
        // Determine how many rows to send based on user preference
        const rowLimit = maxRows !== undefined ? maxRows : (csvData.length > 1000 ? 1000 : csvData.length);
        const effectiveMaxRows = Math.min(rowLimit, csvData.length);

        // Filter data to only include selected columns
        const filteredData = csvData.slice(0, effectiveMaxRows).map((row: Record<string, unknown>) => {
          const filtered: Record<string, unknown> = {};
          selectedColumns.forEach((col: string) => {
            if (col in row) {
              filtered[col] = row[col];
            }
          });
          return filtered;
        });

        const dataContext = `I've uploaded a CSV file with ${csvData.length} rows total.

Selected columns: ${selectedColumns.join(', ')}

${effectiveMaxRows < csvData.length ? `Here's the data (first ${effectiveMaxRows} rows):` : 'Here\'s the complete data:'}
${JSON.stringify(filteredData, null, 2)}

${effectiveMaxRows < csvData.length ? `Note: Only showing first ${effectiveMaxRows} rows due to size, but base your visualizations on patterns from this sample.` : ''}

Please use this data for any visualizations or analysis.`;

        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: dataContext,
              cache_control: { type: 'ephemeral' }
            }
          ]
        });

        // Assistant acknowledges the data
        messages.push({
          role: 'assistant',
          content: `I've received your CSV data with ${csvData.length} rows and ${selectedColumns.length} selected columns. I'm ready to help you analyze and visualize this data.`
        });
      }
    }

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }

    // Add new user message
    messages.push({
      role: 'user',
      content: message
    });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages,
      system: systemPrompt
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Check if response was truncated
    const wasTruncated = response.stop_reason === 'max_tokens';

    // Check if this is a column selection response
    const columnSelectionRegex = /```json\s*(\[[\s\S]*?\])\s*```/;
    const columnMatch = responseText.match(columnSelectionRegex);

    let selectedColumnsFromResponse = null;
    if (columnMatch && (!selectedColumns || selectedColumns.length === 0)) {
      try {
        const parsed = JSON.parse(columnMatch[1]);
        if (Array.isArray(parsed)) {
          selectedColumnsFromResponse = parsed;
        }
      } catch (e) {
        console.error('Failed to parse column selection:', e);
      }
    }

    return NextResponse.json({
      response: responseText,
      selectedColumns: selectedColumnsFromResponse,
      truncated: wasTruncated
    });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return NextResponse.json(
      { error: 'Failed to get response from Claude' },
      { status: 500 }
    );
  }
}
