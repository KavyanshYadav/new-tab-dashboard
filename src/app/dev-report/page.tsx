import { notFound } from 'next/navigation';
import DevReportClient from './DevReportClient';

export const metadata = {
  title: 'Dev Benchmark & Test Report | New Tab Dashboard',
  description: 'Development-only test report, benchmark suite, and API specification explorer.',
};

export default function DevReportPage() {
  // CRITICAL: Strictly available in development environment only
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <DevReportClient />;
}
