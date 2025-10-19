import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, csvData, password } = await request.json();

    // Verify password
    const validPassword = process.env.DEMO_PASSWORD;
    if (!validPassword || password !== validPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build the user message content
    let userMessage = message;

    if (csvData && csvData.length > 0) {
      // Add CSV data context to the message
      const csvSummary = `\n\nI've uploaded a CSV file with ${csvData.length} rows. Here's a sample of the data (first 5 rows):\n\n${JSON.stringify(csvData.slice(0, 5), null, 2)}`;

      // Get column names
      const columns = Object.keys(csvData[0] || {});
      const columnInfo = `\n\nColumns: ${columns.join(', ')}`;

      userMessage = message + csvSummary + columnInfo;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: userMessage
      }],
      system: `You are a data analysis assistant that can create interactive visualizations using Vega-Lite JSON specifications.

When the user uploads CSV data and asks for analysis or visualizations:
1. Analyze the data structure and content
2. Provide insights or answer their questions
3. Create appropriate visualizations using Vega-Lite

When creating charts or visualizations, respond with a JSON code block containing a valid Vega-Lite specification.

Format your response like this:
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

Always include the $schema field and provide valid Vega-Lite v5 specifications. You can use marks like: bar, line, point, area, circle, square, and more.

When CSV data is provided, use the actual data in your Vega-Lite specifications by including the data values directly in the "data.values" field.`
    });

    return NextResponse.json({
      response: response.content[0].type === 'text' ? response.content[0].text : ''
    });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return NextResponse.json(
      { error: 'Failed to get response from Claude' },
      { status: 500 }
    );
  }
}
