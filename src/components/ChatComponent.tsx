'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { Container, Paper, Title, Textarea, Button, FileInput, Text, Stack, Box } from '@mantine/core';
import { IconUpload, IconSend } from '@tabler/icons-react';
import VegaLiteChart from './VegaLiteChart';

interface ChatComponentProps {
  password: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CsvRow = Record<string, any>;

export default function ChatComponent({ password }: ChatComponentProps) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [vegaSpec, setVegaSpec] = useState<object | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[] | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleFileUpload = (file: File | null) => {
    if (!file) {
      setCsvFile(null);
      setCsvData(null);
      return;
    }

    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        setCsvData(results.data as CsvRow[]);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file:' + error);
      }
    });
  };

  const extractVegaSpec = (text: string): object | null => {
    // Look for JSON code blocks
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);

    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        // Check if it has a $schema field indicating it's a Vega-Lite spec
        if (parsed.$schema && parsed.$schema.includes('vega-lite')) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse JSON:', e);
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) return;

    setLoading(true);
    setResponse('');
    setVegaSpec(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          csvData: csvData || undefined,
          password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const responseText = data.response;
        setResponse(responseText);

        // Try to extract Vega-Lite spec from response
        const spec = extractVegaSpec(responseText);
        if (spec) {
          setVegaSpec(spec);
        }
      } else {
        setResponse(`Error: ${data.error}`);
      }
    } catch (error) {
      setResponse('Error: Failed to connect to the API:' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Title order={1}>Chat with Claude</Title>

        <Paper shadow="sm" p="md" radius="md">
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <FileInput
                label="Upload CSV (optional)"
                placeholder="Click to upload CSV file"
                accept=".csv"
                value={csvFile}
                onChange={handleFileUpload}
                disabled={loading}
                leftSection={<IconUpload size={16} />}
                clearable
              />

              {csvFile && csvData && (
                <Text size="sm" c="dimmed">
                  Loaded: {csvFile.name} ({csvData.length} rows)
                </Text>
              )}

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.currentTarget.value)}
                placeholder="Type your message here... (e.g., 'Create a bar chart of the data' or 'Show me statistics')"
                minRows={4}
                disabled={loading}
              />

              <Button
                type="submit"
                disabled={loading || !message.trim()}
                fullWidth
                leftSection={<IconSend size={16} />}
                loading={loading}
              >
                Send Message
              </Button>
            </Stack>
          </form>
        </Paper>

        {response && (
          <Stack gap="md">
            <Paper shadow="sm" p="md" radius="md">
              <Title order={3} mb="md">Claude&apos;s Response:</Title>
              <Text style={{ whiteSpace: 'pre-wrap' }}>{response}</Text>
            </Paper>

            {vegaSpec && (
              <Paper shadow="sm" p="md" radius="md">
                <Title order={3} mb="md">Visualization:</Title>
                <Box>
                  <VegaLiteChart spec={vegaSpec} />
                </Box>
              </Paper>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
