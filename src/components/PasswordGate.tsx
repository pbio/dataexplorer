'use client';

import { useState } from 'react';
import { Container, Paper, Title, Text, PasswordInput, Button, Alert, Stack } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';

interface PasswordGateProps {
  onAuthenticated: (password: string) => void;
}

export default function PasswordGate({ onAuthenticated }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        onAuthenticated(password);
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper shadow="md" p="xl" radius="md" style={{ width: '100%' }}>
        <Stack gap="md">
          <div style={{ textAlign: 'center' }}>
            <IconLock size={48} style={{ margin: '0 auto 1rem' }} />
            <Title order={2} mb="xs">Access Required</Title>
            <Text c="dimmed" size="sm">
              Please enter the password to continue
            </Text>
          </div>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder="Enter password"
                disabled={loading}
                autoFocus
                size="md"
              />

              {error && (
                <Alert color="red" title="Error">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading || !password.trim()}
                fullWidth
                size="md"
                loading={loading}
              >
                Continue
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Container>
  );
}
