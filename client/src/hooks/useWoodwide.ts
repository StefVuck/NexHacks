import { useState, useEffect, useCallback } from 'react';
import { woodwideApi, WoodwideStats, WoodwidePredictions, SensorReading } from '@/api/client';

interface UseWoodwideOptions {
  autoFetch?: boolean;
  pollInterval?: number;
}

export function useWoodwide(options: UseWoodwideOptions = {}) {
  const { autoFetch = true, pollInterval = 5000 } = options;

  const [stats, setStats] = useState<WoodwideStats | null>(null);
  const [predictions, setPredictions] = useState<WoodwidePredictions | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchStats = useCallback(async (nodeId?: string) => {
    try {
      setError(null);
      const data = await woodwideApi.getStats(nodeId);
      setStats(data);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to fetch stats';
      setError(errorMsg);
      console.error('Failed to fetch stats:', err);
      return null;
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      setError(null);
      const data = await woodwideApi.getInsights();
      setInsights(data);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to fetch insights';
      setError(errorMsg);
      console.error('Failed to fetch insights:', err);
      return null;
    }
  }, []);

  const fetchReadings = useCallback(async (nodeId?: string, limit = 100) => {
    try {
      setError(null);
      const data = await woodwideApi.getReadings(nodeId, limit);
      setReadings(data.readings);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to fetch readings';
      setError(errorMsg);
      console.error('Failed to fetch readings:', err);
      return null;
    }
  }, []);

  const analyzeTrafficData = useCallback(async (predictColumn = 'congestion_level') => {
    try {
      setIsAnalyzing(true);
      setError(null);
      const data = await woodwideApi.analyzeTrafficData(predictColumn);
      setPredictions(data);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to analyze data';
      setError(errorMsg);
      console.error('Failed to analyze data:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getPredictions = useCallback(async (modelId: string, datasetId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await woodwideApi.getPredictions(modelId, datasetId);
      setPredictions(data);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to get predictions';
      setError(errorMsg);
      console.error('Failed to get predictions:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportCsv = useCallback(async (nodeId?: string, clearBuffer = false) => {
    try {
      setError(null);
      const data = await woodwideApi.exportCsv(nodeId, clearBuffer);
      return data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to export CSV';
      setError(errorMsg);
      console.error('Failed to export CSV:', err);
      return null;
    }
  }, []);

  const clearBuffer = useCallback(async (nodeId?: string) => {
    try {
      setError(null);
      await woodwideApi.clearBuffer(nodeId);
      // Refresh stats after clearing
      await fetchStats(nodeId);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to clear buffer';
      setError(errorMsg);
      console.error('Failed to clear buffer:', err);
    }
  }, [fetchStats]);

  // Auto-fetch stats on mount and at intervals
  useEffect(() => {
    if (!autoFetch) return;

    fetchStats();
    fetchInsights();
    fetchReadings();

    if (pollInterval > 0) {
      const interval = setInterval(() => {
        fetchStats();
        fetchInsights();
        fetchReadings();
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [autoFetch, pollInterval, fetchStats, fetchInsights, fetchReadings]);

  return {
    stats,
    predictions,
    insights,
    readings,
    isLoading,
    isAnalyzing,
    error,
    fetchStats,
    fetchInsights,
    fetchReadings,
    analyzeTrafficData,
    getPredictions,
    exportCsv,
    clearBuffer,
  };
}
