'use client';
// app/error boundary: the error view with code 500 (pt-BR).
import { Shush } from '@/components/ui/Shush';

export default function ErrorPage() {
  return <Shush errorCode="500" errorTitle="Erro interno do servidor" />;
}
