import { Metadata } from 'next';
import ClientPage from './client-page';

export const metadata: Metadata = {
  title: 'Protocols Dashboard | Yield Maximizer',
  description: 'View real-time APY, APR and utilization rates across DeFi protocols',
};

export default function DashboardPage() {
  return <ClientPage />;
} 