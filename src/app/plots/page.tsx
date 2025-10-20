'use client';

import { useState, useEffect } from 'react';
import { Container, Title, Paper, Text, Button, Group } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import VegaLiteChart from '@/components/VegaLiteChart';

interface SavedPlot {
  id: number;
  plot_name: string;
  plot_json: object;
  timestamp: string;
}

export default function PlotsPage() {
  const [plots, setPlots] = useState<SavedPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecordIds, setExpandedRecordIds] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchPlots();
  }, []);

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plots');
      const data = await res.json();

      if (data.success) {
        const parsedPlots = data.data.map((plot: SavedPlot & { plot_json: string | object }) => ({
          ...plot,
          plot_json: typeof plot.plot_json === 'string'
            ? JSON.parse(plot.plot_json)
            : plot.plot_json
        }));
        setPlots(parsedPlots);
      } else {
        alert('Error fetching plots: ' + data.error);
      }
    } catch (error) {
      alert('Error: Failed to fetch plots: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Saved Plots</Title>
        <Button
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push('/')}
          variant="light"
        >
          Back to Chat
        </Button>
      </Group>

      <Paper shadow="sm" p="md" radius="md">
        <DataTable
          withTableBorder
          withColumnBorders
          striped
          highlightOnHover
          records={plots}
          fetching={loading}
          columns={[
            {
              accessor: 'id',
              title: 'ID',
              width: 80,
            },
            {
              accessor: 'plot_name',
              title: 'Plot Name',
              width: 300,
            },
            {
              accessor: 'timestamp',
              title: 'Created',
              width: 200,
              render: (plot) => formatDate(plot.timestamp),
            },
          ]}
          rowExpansion={{
            allowMultiple: true,
            expanded: {
              recordIds: expandedRecordIds,
              onRecordIdsChange: setExpandedRecordIds,
            },
            content: ({ record }) => (
              <Paper p="md" withBorder>
                <Title order={4} mb="md">
                  {record.plot_name}
                </Title>
                {record.plot_json ? (
                  <VegaLiteChart spec={record.plot_json} />
                ) : (
                  <Text c="dimmed">No plot data available</Text>
                )}
              </Paper>
            ),
          }}
        />
      </Paper>
    </Container>
  );
}
