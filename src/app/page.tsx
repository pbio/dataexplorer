'use client';

import { useState } from "react";
import { AppShell } from '@mantine/core';
import ChatComponent from "@/components/ChatComponent";
import PasswordGate from "@/components/PasswordGate";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const handleAuthenticated = (pwd: string) => {
    setPassword(pwd);
    setIsAuthenticated(true);
  };

  return (
    <AppShell>
      {!isAuthenticated ? (
        <PasswordGate onAuthenticated={handleAuthenticated} />
      ) : (
        <ChatComponent password={password} />
      )}
    </AppShell>
  );
}
